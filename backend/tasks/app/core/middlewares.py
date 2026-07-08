from typing import Any

import anyio
from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse
from starlette.types import ASGIApp


class ContentTypeCheckMiddleware(BaseHTTPMiddleware):
    """
    Middleware для автоматического блокирования загрузки файлов.

    Блокировка распространется на все роуты, не включенных в список
     допущенных для загрузки файлов.
    """

    def __init__(self, app: ASGIApp, file_endpoints: set[str] = None) -> None:
        """Установить значение для списка url, допускающих загрузку файлов."""
        super().__init__(app)
        self.file_endpoints = file_endpoints or set()

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        path = request.url.path
        content_type = request.headers.get("content-type", "").lower()

        if request.method in ("POST", "PUT", "PATCH"):

            if path in self.file_endpoints:
                if "multipart/form-data" not in content_type:
                    return JSONResponse(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        content={
                            "error": "Ошибка валидации данных.",
                            "detail": [
                                {
                                    "field": "body",
                                    "msg": "Ожидается загрузка файла(ов)."
                                },
                            ]
                        }
                    )

            else:
                allowed_types = (
                    "application/json",
                    "application/x-www-form-urlencoded",
                    "multipart/form-data",
                )
                if not any(t in content_type for t in allowed_types):
                    return JSONResponse(
                        status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                        content={
                            "error": "Ошибка валидации данных.",
                            "detail": [
                                {
                                    "field": "body",
                                    "msg": (
                                        "Неизвестный тип данных. "
                                        "Разрешены JSON или Form data."
                                    )
                                }
                            ]
                        },
                    )

                if "multipart/form-data" in content_type:
                    chunks = []
                    body_chunk = b""
                    has_file = False

                    original_receive = request._receive

                    while len(body_chunk) < 65536:
                        try:

                            with anyio.fail_after(1.0):
                                message = await original_receive()
                        except TimeoutError:
                            break

                        if message["type"] != "http.request":
                            chunks.append(message)
                            break

                        chunk_bytes = message.get("body", b"")
                        body_chunk += chunk_bytes
                        chunks.append(message)

                        if b'filename="' in body_chunk:
                            has_file = True
                            break

                        if not message.get("more_body", False):
                            break

                    if has_file:
                        return JSONResponse(
                            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                            content={
                                "error": "Ошибка валидации данных.",
                                "detail": [
                                    {
                                        "field": "body",
                                        "msg": (
                                            "Этот эндпоинт принимает только "
                                            "текстовые  поля, но не файлы."
                                        )
                                    }
                                ]
                            },
                        )

                    chunks_iter = iter(chunks)

                    async def receive_wrapper() -> dict[str, Any]:
                        try:
                            return next(chunks_iter)
                        except StopIteration:
                            return await original_receive()

                    request._receive = receive_wrapper

        return await call_next(request)
