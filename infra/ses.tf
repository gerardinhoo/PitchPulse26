# ── SES: transactional email for PitchPulse 26 ──
#
# Manages the SES domain identity for `pitchpulse26.com` and the DKIM tokens.
# Because the domain lives at Namecheap (not Route53), Terraform cannot publish
# the DNS records automatically. After `terraform apply`, copy the values from
# the `ses_dns_records_for_namecheap` output into Namecheap's Advanced DNS
# panel. SES will auto-verify once the records propagate (usually a few
# minutes).
#
# The same applies to leaving the SES sandbox: request production access in
# the AWS console once the identity is "Verified". Sandbox can still be used
# for local testing against a verified test address.

# ── Domain identity + DKIM ──
resource "aws_ses_domain_identity" "main" {
  domain = var.email_domain
}

resource "aws_ses_domain_dkim" "main" {
  domain = aws_ses_domain_identity.main.domain
}

# Pre-verify the specific sender address so it also works under SES sandbox.
resource "aws_ses_email_identity" "sender" {
  email = var.email_from
}

# ── Lambda permission to send via SES ──
data "aws_iam_policy_document" "lambda_ses" {
  statement {
    actions = [
      "ses:SendEmail",
      "ses:SendRawEmail",
    ]
    resources = [
      aws_ses_domain_identity.main.arn,
      aws_ses_email_identity.sender.arn,
    ]
    # Restrict the From address so a compromised Lambda can't impersonate
    # other addresses on the domain.
    condition {
      test     = "StringEquals"
      variable = "ses:FromAddress"
      values   = [var.email_from]
    }
  }
}

resource "aws_iam_role_policy" "lambda_ses" {
  name   = "${var.project_name}-lambda-ses"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.lambda_ses.json
}

# ── SSM parameter so the app reads the sender at runtime ──
resource "aws_ssm_parameter" "email_from" {
  name  = "/${var.project_name}/EMAIL_FROM"
  type  = "String"
  value = var.email_from
}
