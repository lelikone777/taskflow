from core.config import settings
from core.middlewares import ContentTypeCheckMiddleware
from core.utils import format_error_detail
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from routers.projects import project_router
from routers.users import user_router

app = FastAPI(
    root_path="/api/tasks",
    title="TaskFlow",
    description="""
                Личный таск-трекер с подпроектами, под-задачами и напоминаниями
                """,
)

app.include_router(project_router)
app.include_router(user_router)
app.add_middleware(
    ContentTypeCheckMiddleware, file_endpoints=settings.ALLOWED_FILE_ROUTES
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "Ошибка валидации данных.",
            "details": await format_error_detail(exc),
        },
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(
    request: Request,
    exc: HTTPException,
) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail["type"],
            "details": [
                {"field": exc.detail["field"], "message": exc.detail["msg"]},
            ]
        },
    )


@app.exception_handler(status.HTTP_404_NOT_FOUND)
async def custom_404_handler(request: Request, exc: Exception) -> JSONResponse:

    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={
                "error": exc.detail["type"],
                "details": [
                    {
                        "field": exc.detail["field"],
                        "message": exc.detail["msg"]
                    },
                ]
            }
        )

    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "Путь не найден",
            "details": {
                "field": "path",
                "message": "Пожалуйста, проверьте правильность URL",
            },
        },
    )


@app.exception_handler(status.HTTP_401_UNAUTHORIZED)
async def custom_401_handler(request: Request, __: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content={
            "error": "Ошибка авторизации",
            "details": [
                {
                    "field": "Authorization",
                    "message": "Пожалуйста, авторизуйтесь"
                }
            ],
        },
    )
