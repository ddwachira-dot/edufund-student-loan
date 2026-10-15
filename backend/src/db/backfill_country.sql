UPDATE users SET last_ip = '102.206.97.56', country = 'Kenya', country_code = 'KE', city = 'Nyeri' WHERE last_ip IS NULL;
UPDATE loan_applications SET applicant_ip = '102.206.97.56', applicant_country = 'Kenya', applicant_country_code = 'KE', applicant_city = 'Nyeri' WHERE applicant_country IS NULL;
