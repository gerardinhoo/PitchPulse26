output "api_url" {
  description = "API Gateway endpoint URL"
  value       = aws_apigatewayv2_api.http.api_endpoint
}

output "amplify_app_url" {
  description = "Amplify default domain"
  value       = "https://main.${aws_amplify_app.frontend.default_domain}"
}

output "lambda_function_name" {
  description = "Lambda function name (for CI/CD deploys)"
  value       = aws_lambda_function.api.function_name
}

output "ci_access_key_id" {
  description = "CI user AWS access key ID (add to GitHub secrets)"
  value       = aws_iam_access_key.ci.id
}

output "ci_secret_access_key" {
  description = "CI user AWS secret access key (add to GitHub secrets)"
  value       = aws_iam_access_key.ci.secret
  sensitive   = true
}

# ── SES DNS records to paste into Namecheap ──
#
# Run:  terraform output ses_dns_records_for_namecheap
#
# 1 TXT record + 3 CNAME records. In Namecheap's Advanced DNS panel, the host
# is the FIRST column (without the trailing domain — Namecheap appends it
# automatically), and the value is the SECOND column.
output "ses_dns_records_for_namecheap" {
  description = "DNS records to add in Namecheap so SES can verify the domain and sign mail with DKIM"
  value = {
    domain_verification_txt = {
      host  = "_amazonses.${var.email_domain}"
      type  = "TXT"
      value = aws_ses_domain_identity.main.verification_token
    }
    dkim_cnames = [
      for token in aws_ses_domain_dkim.main.dkim_tokens : {
        host  = "${token}._domainkey.${var.email_domain}"
        type  = "CNAME"
        value = "${token}.dkim.amazonses.com"
      }
    ]
    # Optional but recommended for deliverability. Add manually after DKIM
    # is verified; not tracked by Terraform.
    recommended_spf = {
      host  = var.email_domain
      type  = "TXT"
      value = "v=spf1 include:amazonses.com ~all"
    }
    recommended_dmarc = {
      host  = "_dmarc.${var.email_domain}"
      type  = "TXT"
      value = "v=DMARC1; p=none; rua=mailto:postmaster@${var.email_domain}"
    }
  }
}

output "email_from" {
  description = "Sender address used by the app (also stored in SSM)"
  value       = var.email_from
}
