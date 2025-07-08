#!/bin/sh
# Ensure the database directory exists
mkdir -p /app/data
# Start the application
exec node server.js