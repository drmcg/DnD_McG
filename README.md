# DnD_McG

DnD_McG is a small web app and server for running a Dungeons & Dragons helper. This README explains how to build and run the project locally, build a Docker image, pull the image produced by CI, and how the repository CI publishes images.

Prerequisites
- Node.js 20+ (for local builds)
- npm
- Docker (to build/run container images)
- (Optional) A GitHub account with permissions on this repo to configure secrets

Local development
1. Install dependencies and build
   - If you have a lockfile present:
     npm ci
   - Otherwise:
     npm install

   Build the web app (if present):
     npm run build

2. Run locally (development server)
   - The repository includes a simple `server.js` that serves the built files. To run it locally after building:
     node server.js
   - The server listens on port 5173 by default. Open http://localhost:5173

Build and run with Docker (local)
- Build the Docker image locally (image name must be lowercase):

  docker build -t drmcg/dnd_mcg:local .

- Run the container:

  docker run --rm -p 5173:5173 drmcg/dnd_mcg:local

- The app will be available at http://localhost:5173

CI and container publishing
This repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` that:
- Installs dependencies (runs `npm ci` if a lockfile exists, otherwise `npm install`).
- Runs type checks and tests if configured.
- Builds the web app and uploads `dist` as an artifact.
- Builds a Docker image using the repository name lowercased as the image name and tags it with the short commit SHA.
- Saves the built image as an artifact (`image.tar`).
- Optionally logs in and pushes the image to GitHub Container Registry (GHCR) when a token is provided.

Image naming and tags
- Image tag used by the workflow: the short commit SHA of the run (e.g. `63f39af`).
- Local Docker image name used in CI is the lowercased repository path, for example: `drmcg/dnd_mcg:<short-sha>`.
- If pushed to GHCR the image name becomes: `ghcr.io/<lowercased-owner>/<lowercased-repo>:<short-sha>` (for this repo: `ghcr.io/drmcg/dnd_mcg:<short-sha>`).

Find the exact tag used
- From the Actions run page: click the CI run and view the commit displayed (the short SHA is the tag).
- From the job logs: the docker build step prints the tag used.
- Or locally using git:
  git rev-parse --short <commit-or-branch>

Pulling the image from GHCR
- If the workflow pushed the image to GHCR, pull it with:

  # If the package is private, authenticate first
  echo "$GHCR_TOKEN" | docker login ghcr.io -u <github-username> --password-stdin

  docker pull ghcr.io/drmcg/dnd_mcg:<short-sha>
  docker run --rm -p 5173:5173 ghcr.io/drmcg/dnd_mcg:<short-sha>

Using the workflow artifact (image.tar)
- Download the `docker-image` artifact from the Actions run (Artifacts → docker-image → download `image.tar`).
- Load it locally:

  docker load -i image.tar
  docker images
  docker run --rm -p 5173:5173 drmcg/dnd_mcg:<short-sha>

Publishing to GHCR from CI
- The workflow will only attempt to push when you provide a token in the repository secrets.
- Option A: Use a Personal Access Token (PAT) with `write:packages` (and `read:packages`) and add it as a repository secret named `GHCR_TOKEN`.
- Option B: Use the automatically provided `GITHUB_TOKEN` by adjusting the workflow to login with `secrets.GITHUB_TOKEN` (the workflow can be updated for this behavior). Note: `GITHUB_TOKEN` has limited scopes and may be sufficient for publishing packages for the same repository when permissions are set.

Notes
- The Dockerfile exposes port 5173 and the container runs `node server.js` in production mode.
- Docker image names must be lowercase — the CI converts the owner/repo name to lowercase automatically.
- CI artifacts (web-dist and docker-image) are attached to the Actions run for easy download.

Questions or improvements
- Want the workflow to also tag `:latest`? Want the workflow to use `GITHUB_TOKEN` automatically? I can update the workflow or README with those changes — tell me which you prefer.
