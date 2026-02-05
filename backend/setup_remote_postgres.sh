#!/bin/bash
# Script to configure PostgreSQL 16 for remote connections (Ubuntu)

echo "Configuring PostgreSQL for remote connections..."

# Backup postgresql.conf
sudo cp /etc/postgresql/16/main/postgresql.conf /etc/postgresql/16/main/postgresql.conf.backup

# Allow connections from any IP
sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf
sudo sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/" /etc/postgresql/16/main/postgresql.conf

# Backup pg_hba.conf
sudo cp /etc/postgresql/16/main/pg_hba.conf /etc/postgresql/16/main/pg_hba.conf.backup

# Add rule to allow connections from any IP with password
echo "host    shar_messenger    postgres    0.0.0.0/0    md5" | sudo tee -a /etc/postgresql/16/main/pg_hba.conf

# Restart PostgreSQL
sudo systemctl restart postgresql

echo "PostgreSQL configured for remote connections!"
echo "Connection string: postgresql://postgres@81.90.31.129:5432/shar_messenger"
