from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    opensearch_url: str = "http://opensearch:9200"
    redis_url: str = "redis://redis:6379/0"
    api_port: int = 8000
    auto_create_tables: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()



