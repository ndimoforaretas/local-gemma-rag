"""
Router for knowledge base management: browse, upload, ingest, and delete documents.
"""

import json
import os
import shutil
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, UploadFile

from backend.config import get_settings, logger
from backend.services.ingest import dbos as ingest_dbos
from backend.services.ingest import ingest_workflow
from backend.services.vector_db import vector_db

router = APIRouter(tags=["Knowledge Base"])

settings = get_settings()


# ── Browse ───────────────────────────────────────────────────────────────────

@router.get("/kb")
async def get_knowledge_base():
    """
    Return the knowledge base structure derived from indexed document metadata.
    Groups files into logical folders for the frontend drill-down UI.
    """
    try:
        if not os.path.exists(settings.metadata_file):
            return {"folders": []}

        with open(settings.metadata_file, "r") as f:
            metadata = json.load(f)

        unique_sources = list(
            set(m["source"] for m in metadata if not m.get("deleted"))
        )

        folders: dict = {}
        for src in unique_sources:
            root = "General Documents"
            description = "Miscellaneous documents and indexed resources."
            icon = "file-text"

            if " > " in src:
                parts = src.split(" > ")
                root = parts[0]
                icon = "package"
                description = f"Repository for {root.replace('_', ' ')} related intelligence."
            subfolder_name = src.split(" > ")[1] if " > " in src else src

            file_meta = {
                "name": src.split(" > ")[-1] if " > " in src else src,
                "type": "pdf" if src.lower().endswith(".pdf") else "file",
                "size": "N/A",
                "modified": "N/A",
            }

            try:
                for f_name in os.listdir(settings.docs_dir):
                    if src.endswith(f_name):
                        path = os.path.join(settings.docs_dir, f_name)
                        stats = os.stat(path)
                        file_meta["size"] = f"{stats.st_size / 1024:.1f} KB"
                        file_meta["modified"] = datetime.fromtimestamp(
                            stats.st_mtime
                        ).strftime("%b %d, %Y")
                        break
            except OSError:
                logger.warning("Could not stat files in %s", settings.docs_dir)

            if root not in folders:
                folders[root] = {
                    "name": root,
                    "description": description,
                    "icon": icon,
                    "updated": "Just now",
                    "subfolders": {},
                }

            if subfolder_name not in folders[root]["subfolders"]:
                folders[root]["subfolders"][subfolder_name] = {
                    "name": subfolder_name,
                    "files": [file_meta],
                }
            else:
                existing = folders[root]["subfolders"][subfolder_name]["files"]
                if not any(f["name"] == file_meta["name"] for f in existing):
                    existing.append(file_meta)

            if file_meta["modified"] != "N/A":
                folders[root]["updated"] = file_meta["modified"]

        result = [
            {
                "name": data["name"],
                "description": data["description"],
                "icon": data["icon"],
                "updated": data["updated"],
                "subfolders": list(data["subfolders"].values()),
            }
            for data in folders.values()
        ]

        return {"folders": result}

    except Exception:
        logger.exception("Error building knowledge base listing")
        return {"folders": []}


# ── Upload ───────────────────────────────────────────────────────────────────

def _sanitize_filename(filename: str) -> str:
    """
    Remove path separators and leading dots to prevent directory traversal.
    """
    # Strip directory components
    name = os.path.basename(filename)
    # Remove leading dots (hidden files / traversal)
    name = name.lstrip(".")
    return name or "unnamed_upload.pdf"


@router.post("/upload")
async def upload_documents(files: list[UploadFile] = File(...)):
    """Upload PDF files to the docs/ directory for later ingestion."""
    os.makedirs(settings.docs_dir, exist_ok=True)

    saved_files: list[str] = []
    for file in files:
        safe_name = _sanitize_filename(file.filename or "upload.pdf")
        file_path = os.path.join(settings.docs_dir, safe_name)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        saved_files.append(safe_name)
        logger.info("Uploaded file: %s", safe_name)

    return {
        "status": "success",
        "message": f"Successfully uploaded: {', '.join(saved_files)}",
        "files": saved_files,
    }


# ── Ingest ───────────────────────────────────────────────────────────────────

@router.post("/ingest")
async def ingest_endpoint():
    """Trigger a durable DBOS ingestion workflow and return its ID."""
    try:
        handle = ingest_dbos.start_workflow(ingest_workflow)
        logger.info("Started ingestion workflow: %s", handle.workflow_id)
        return {"status": "success", "workflow_id": handle.workflow_id}
    except Exception as e:
        logger.exception("Failed to start ingestion workflow")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/ingest/status/{workflow_id}")
def get_ingest_status(workflow_id: str):
    """
    Poll the status and steps of an ingestion workflow.

    If the workflow has completed successfully, the in-memory
    vector database is automatically reloaded.
    """
    try:
        status = ingest_dbos.get_workflow_status(workflow_id)
        if not status:
            return {"status": "not_found"}

        if status.status == "SUCCESS":
            logger.info("Workflow %s succeeded — reloading vector DB", workflow_id)
            vector_db.reload()

        steps = ingest_dbos.list_workflow_steps(workflow_id)

        formatted_steps = []
        for step in steps:
            fn_name = step.get("function_name", "Unknown Step")
            out_val = step.get("output", [])

            safe_out: list = []
            if out_val:
                try:
                    parsed = json.loads(out_val) if isinstance(out_val, str) else out_val
                    if fn_name == "process_single_document" and isinstance(parsed, list) and len(parsed) > 0:
                        safe_out = [{"source": parsed[0].get("source", "Unknown")}]
                except (json.JSONDecodeError, TypeError):
                    pass

            formatted_steps.append({
                "name": fn_name,
                "status": "COMPLETED" if not step.get("error") else "ERROR",
                "output": safe_out,
            })

        # Inject a RUNNING step indicator for the frontend when workflow is pending.
        if status.status == "PENDING":
            expected_order = [
                "list_document_files",
                "process_single_document",
                "embed_batch",
                "save_vector_store",
            ]
            last_completed = formatted_steps[-1]["name"] if formatted_steps else None

            if last_completed in expected_order:
                idx = expected_order.index(last_completed)
                if idx + 1 < len(expected_order) and last_completed not in [
                    "process_single_document",
                    "embed_batch",
                ]:
                    next_step = expected_order[idx + 1]
                    formatted_steps.append({"name": next_step, "status": "RUNNING", "output": []})
                else:
                    formatted_steps.append({
                        "name": last_completed,
                        "status": "RUNNING",
                        "output": formatted_steps[-1]["output"],
                    })
            elif not formatted_steps:
                formatted_steps.append({"name": "list_document_files", "status": "RUNNING", "output": []})

        return {
            "workflow_id": workflow_id,
            "status": status.status,
            "steps": formatted_steps,
        }
    except Exception as e:
        logger.exception("Error fetching workflow status")
        raise HTTPException(status_code=500, detail=str(e))


# ── Delete ───────────────────────────────────────────────────────────────────

@router.delete("/api/docs/{filename}")
async def delete_document(filename: str):
    """Soft-delete a document from the vector store and remove the physical file."""
    safe_name = _sanitize_filename(filename)
    try:
        file_path = os.path.join(settings.docs_dir, safe_name)
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info("Deleted file: %s", safe_name)

        if os.path.exists(settings.metadata_file):
            with open(settings.metadata_file, "r") as f:
                metadata = json.load(f)

            for item in metadata:
                if item.get("source") == safe_name:
                    item["deleted"] = True

            with open(settings.metadata_file, "w") as f:
                json.dump(metadata, f)

            vector_db.reload()

        return {"status": "success"}
    except Exception as e:
        logger.exception("Error deleting document %s", safe_name)
        raise HTTPException(status_code=500, detail=str(e))
