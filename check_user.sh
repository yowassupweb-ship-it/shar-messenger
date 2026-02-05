#!/bin/bash
sudo -u postgres psql -d shar_messenger -c "SELECT username, telegram_id, password FROM users WHERE username = 'admin';"
