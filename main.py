from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

import os
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from pydantic import BaseModel
from pathlib import Path
import resend

import database
import agent
import scheduler
from domain_checker import get_price, get_purchase_links, check_domains_batch

# Initialize Resend
resend.api_key = os.environ.get("RESEND_API_KEY")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    database.init_db()
    scheduler.start_scheduler()
    yield
    # Shutdown
    scheduler.stop_scheduler()


app = FastAPI(title="Domain AI Agent", lifespan=lifespan)

# Add CORS middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5175", "http://127.0.0.1:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "server": "python-fastapi"}

# Setup templates and static files
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=BASE_DIR / "templates")


# Pydantic models
class FeedbackRequest(BaseModel):
    suggestion_id: int
    liked: bool
    reason: str | None = None


class SettingsUpdate(BaseModel):
    daily_count: int | None = None
    description: str | None = None
    tlds: str | None = None
    schedule_hour: int | None = None


class SubscribeRequest(BaseModel):
    email: str


class GenerateRequest(BaseModel):
    description: str
    count: int = 10
    tlds: str = ".com,.io,.ai"
    check_availability: bool = True


class CheckDomainsRequest(BaseModel):
    domains: list[str]


# Routes
@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/privacy", response_class=HTMLResponse)
async def privacy(request: Request):
    return templates.TemplateResponse("privacy.html", {"request": request})


@app.get("/api", response_class=HTMLResponse)
async def api_docs(request: Request):
    return templates.TemplateResponse("api.html", {"request": request})


@app.get("/mcp", response_class=HTMLResponse)
async def mcp_docs(request: Request):
    return templates.TemplateResponse("mcp.html", {"request": request})


@app.get("/api/suggestions")
async def get_suggestions():
    suggestions = database.get_pending_suggestions()
    # Add price and links to each suggestion
    for s in suggestions:
        s["price"] = get_price(s["domain"])
        s["links"] = get_purchase_links(s["domain"])
        s["reason"] = s.get("reason", "")
    return {"suggestions": suggestions}


@app.post("/api/suggestions/generate")
async def generate_suggestions():
    try:
        result = agent.generate_and_store_suggestions()
        return result  # Returns {"suggestions": [...], "usage": {...}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {e}")


@app.post("/api/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    # Get the suggestion
    suggestions = database.get_pending_suggestions()
    suggestion = next((s for s in suggestions if s["id"] == feedback.suggestion_id), None)

    if not suggestion:
        raise HTTPException(status_code=404, detail="Suggestion not found")

    # Update suggestion status
    status = "liked" if feedback.liked else "disliked"
    database.update_suggestion_status(feedback.suggestion_id, status)

    # Add to preferences for learning
    database.add_preference(suggestion["domain"], feedback.liked, feedback.reason)

    return {"success": True}


@app.get("/api/settings")
async def get_settings():
    settings = database.get_all_settings()
    return {"settings": settings}


@app.post("/api/settings")
async def update_settings(settings: SettingsUpdate):
    if settings.daily_count is not None:
        if settings.daily_count < 1 or settings.daily_count > 50:
            raise HTTPException(status_code=400, detail="daily_count must be between 1 and 50")
        database.update_setting("daily_count", str(settings.daily_count))

    if settings.description is not None:
        database.update_setting("description", settings.description)

    if settings.tlds is not None:
        database.update_setting("tlds", settings.tlds)

    if settings.schedule_hour is not None:
        if settings.schedule_hour < 0 or settings.schedule_hour > 23:
            raise HTTPException(status_code=400, detail="schedule_hour must be between 0 and 23")
        database.update_setting("schedule_hour", str(settings.schedule_hour))
        scheduler.reschedule(settings.schedule_hour)

    return {"success": True, "settings": database.get_all_settings()}


@app.get("/api/history")
async def get_history():
    preferences = database.get_preferences(100)
    return {"history": preferences}


@app.post("/api/subscribe")
async def subscribe(req: SubscribeRequest):
    email = req.email.lower().strip()

    # Basic validation
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="Invalid email address")

    # Add to database
    added = database.add_subscriber(email)
    if not added:
        raise HTTPException(status_code=400, detail="Email already subscribed")

    # Send welcome email via Resend
    try:
        resend.Emails.send({
            "from": "Domain AI Agent <onboarding@resend.dev>",
            "to": email,
            "subject": "Welcome to Domain AI Agent!",
            "html": """
                <h2>Welcome!</h2>
                <p>You're now subscribed to daily domain recommendations.</p>
                <p>Every day, we'll send you personalized domain suggestions based on your preferences.</p>
                <p>Happy domain hunting!</p>
            """
        })
    except Exception as e:
        print(f"Failed to send welcome email: {e}")

    return {"success": True, "message": "Subscribed successfully"}


# Domain availability check endpoint (WHOIS-based)
@app.post("/api/check-domains")
async def check_domains(req: CheckDomainsRequest):
    """
    Check domain availability using WHOIS.
    Returns a dict mapping domain -> availability (true/false/null).
    """
    if not req.domains:
        return {"results": {}}

    if len(req.domains) > 100:
        raise HTTPException(status_code=400, detail="Maximum 100 domains per request")

    results = check_domains_batch(req.domains)
    return {"results": results}


# Public API for programmatic access
@app.post("/api/v1/generate")
async def api_generate(req: GenerateRequest):
    """
    Generate domain/name suggestions via API.

    Request body:
    - description: What kind of names you're looking for
    - count: Number of suggestions (default: 10, max: 50)
    - tlds: Comma-separated TLDs like ".com,.io,.ai" (default: ".com,.io,.ai")
    - check_availability: Whether to check domain availability (default: true)

    Returns:
    - suggestions: List of {name, domain, reason, available, price, links}
    - usage: Token usage and cost info
    """
    if req.count < 1 or req.count > 50:
        raise HTTPException(status_code=400, detail="count must be between 1 and 50")

    if not req.description.strip():
        raise HTTPException(status_code=400, detail="description is required")

    try:
        # Generate using the agent
        from agent import generate_domains_with_params
        suggestions, usage = generate_domains_with_params(
            description=req.description,
            count=req.count,
            tlds=req.tlds,
            check_availability=req.check_availability
        )

        # Add price and links
        for s in suggestions:
            s["price"] = get_price(s["domain"])
            s["links"] = get_purchase_links(s["domain"])

        return {
            "suggestions": suggestions,
            "usage": usage
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating suggestions: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8080)
