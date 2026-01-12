from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import database
import agent

scheduler = BackgroundScheduler()


def daily_job():
    """Daily job to generate new domain suggestions."""
    print("Running daily domain generation job...")
    try:
        suggestions = agent.generate_and_store_suggestions()
        print(f"Generated {len(suggestions)} new domain suggestions")
    except Exception as e:
        print(f"Error in daily job: {e}")


def start_scheduler():
    """Start the background scheduler with daily job."""
    # Get schedule hour from settings
    hour = int(database.get_setting("schedule_hour") or "9")

    # Add daily job
    scheduler.add_job(
        daily_job,
        trigger=CronTrigger(hour=hour, minute=0),
        id="daily_domain_generation",
        replace_existing=True
    )

    scheduler.start()
    print(f"Scheduler started. Daily job runs at {hour}:00")


def stop_scheduler():
    """Stop the background scheduler."""
    scheduler.shutdown()


def reschedule(hour: int):
    """Reschedule the daily job to a new hour."""
    scheduler.reschedule_job(
        "daily_domain_generation",
        trigger=CronTrigger(hour=hour, minute=0)
    )
    print(f"Rescheduled daily job to {hour}:00")


def trigger_now():
    """Manually trigger the daily job immediately."""
    daily_job()
