from app.db.database import SessionLocal
from sqlalchemy import text

def get_allowed_apps() -> list:
    """DB の poc テーブルと models テーブルから allowed_apps を組み立てる"""
    db = SessionLocal()
    try:
        rows = db.execute(text("""
            SELECT p.id, p.models_id, m.version
            FROM llamune.poc p
            JOIN llamune.models m ON m.id = p.models_id
            WHERE p.models_id IS NOT NULL
        """)).fetchall()

        apps = [
            {
                "app_name": f"p{row[0]}-m{row[1]}",
                "version": row[2],
            }
            for row in rows
        ]

        poc_rows = db.execute(text("""
            SELECT id FROM llamune.poc
        """)).fetchall()

        model_rows = db.execute(text("""
            SELECT id, version FROM llamune.models
            WHERE model_type = 'fine-tuned'
        """)).fetchall()

        existing = {a["app_name"] for a in apps}
        for poc in poc_rows:
            for model in model_rows:
                app_name = f"p{poc[0]}-m{model[0]}"
                if app_name not in existing:
                    apps.append({
                        "app_name": app_name,
                        "version": model[1] or 1,
                    })

        return apps
    finally:
        db.close()
