# ── Amplify App ──
resource "aws_amplify_app" "frontend" {
  name       = "${var.project_name}-frontend"
  repository = var.github_repo_url

  access_token = var.github_token

  build_spec = <<-YAML
    version: 1
    applications:
      - frontend:
          phases:
            preBuild:
              commands:
                - npm ci
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: dist
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
        appRoot: client
  YAML

  environment_variables = {
    VITE_API_URL = aws_apigatewayv2_api.http.api_endpoint
  }

  # SPA rewrites — serve static assets normally, fallback to index.html
  custom_rule {
    source = "</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|webp)$)([^.]+$)/>"
    status = "200"
    target = "/index.html"
  }
}

# ── Branch (auto-deploy on push to main) ──
resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "main"

  framework = "React"
  stage     = "PRODUCTION"

  environment_variables = {
    VITE_API_URL = aws_apigatewayv2_api.http.api_endpoint
  }
}
