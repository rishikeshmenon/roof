from .worker import celery_app


@celery_app.task(rate_limit="10/s")
def example_add(x: int, y: int) -> int:
    return x + y



