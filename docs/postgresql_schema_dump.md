# Получение схемы базы данных PostgreSQL и сохранение в SQL файл

В этом документе описаны способы получения схемы базы данных PostgreSQL и сохранения её в SQL файл.

## Использование pg_dump для получения схемы

### 1. Полный дамп базы данных (включая схему и данные)

```bash
pg_dump -h localhost -p 5432 -U postgres -d tactris > full_dump.sql
```

При выполнении команды потребуется ввести пароль пользователя.

### 2. Дамп только схемы (без данных)

```bash
pg_dump -h localhost -p 5432 -U postgres -d tactris --schema-only > schema_only.sql
```

### 3. Дамп только структуры таблиц (без данных, триггеров, индексов)

```bash
pg_dump -h localhost -p 5432 -U postgres -d tactris --schema-only --no-owner --no-privileges > structure_only.sql
```

### 4. Использование переменных окружения

Для удобства можно использовать переменные окружения:

```bash
export PGPASSWORD="password"
pg_dump -h localhost -p 5432 -U postgres -d tactris --schema-only > schema.sql
```

### 5. Скрипт для автоматического дампа с параметрами из .env файла

Создайте скрипт `dump_schema.sh`:

```bash
#!/bin/bash

# Загрузка переменных из .env файла
if [ -f .env ]; then
    export $(cat .env | sed 's/#.*//g' | xargs)
fi

# Установка значений по умолчанию, если переменные не определены
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-tactris}
DB_USER=${DB_USER:-postgres}
DB_PASSWORD=${DB_PASSWORD:-password}

# Установка пароля для pg_dump
export PGPASSWORD="$DB_PASSWORD"

# Создание дампа схемы
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --schema-only > schema.sql

echo "Дамп схемы базы данных сохранен в файл schema.sql"
```

Для Windows PowerShell можно создать скрипт `dump_schema.ps1`:

```powershell
# Загрузка переменных из .env файла
if (Test-Path ".env") {
    Get-Content .env | ForEach-Object {
        if ($_ -notmatch "^#.*" -and $_ -match "^(.+?)=(.*)$") {
            $name = $matches[1]
            $value = $matches[2] -replace '^"(.*)"$', '$1'
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Установка значений по умолчанию
$DB_HOST = if ($env:DB_HOST) { $env:DB_HOST } else { "localhost" }
$DB_PORT = if ($env:DB_PORT) { $env:DB_PORT } else { "5432" }
$DB_NAME = if ($env:DB_NAME) { $env:DB_NAME } else { "tactris" }
$DB_USER = if ($env:DB_USER) { $env:DB_USER } else { "postgres" }
$DB_PASSWORD = if ($env:DB_PASSWORD) { $env:DB_PASSWORD } else { "password" }

# Установка пароля для pg_dump
$env:PGPASSWORD = $DB_PASSWORD

# Создание дампа схемы
$command = "pg_dump -h `"$DB_HOST`" -p `"$DB_PORT`" -U `"$DB_USER`" -d `"$DB_NAME`" --schema-only > schema.sql"
Invoke-Expression $command

Write-Host "Дамп схемы базы данных сохранен в файл schema.sql"
```

## Использование с Docker

Если PostgreSQL запущен в Docker контейнере:

```bash
docker exec -t container_name pg_dump -U postgres -d tactris --schema-only > schema.sql
```

## Проверка существующего дампа

В проекте уже существует файл `schema.sql`, который является дампом схемы базы данных, созданным с помощью `pg_dump`. Этот файл можно использовать как эталонную схему для восстановления структуры базы данных:

```bash
psql -h localhost -p 5432 -U postgres -d tactris -f schema.sql
```

## Заключение

Для получения актуальной схемы вашей базы данных используйте команду `pg_dump` с опцией `--schema-only`, что создаст SQL файл с определениями таблиц, индексов, ограничений и других объектов базы данных без фактических данных.