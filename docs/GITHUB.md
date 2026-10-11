# Publish this code to your GitHub repository

The hosting source repository is already configured as `origin`. Keep it intact. Add GitHub as a second remote named `github` so normal Sites publishing continues to work.

1. Sign in at https://github.com/new and create an empty `RUdown` repository. Choose the visibility you need for your submission. Leave the README, `.gitignore`, and license initialization options unchecked.
2. Copy the repository HTTPS URL. It will look like `https://github.com/YOUR-USERNAME/RUdown.git`.
3. Authenticate to GitHub using GitHub Desktop or Git's credential manager. Never paste a password, personal access token, or private key into this chat.
4. In the project directory, after checking the staged/tracked files for secrets, run:

```powershell
git remote add github https://github.com/YOUR-USERNAME/RUdown.git
git push github main
```

Replace the example URL with your repository's actual URL. If `github` already exists, inspect it before changing anything. Do not replace the hosting `origin` or force-push an existing repository.

The project `.gitignore` excludes `.env*`, local databases, dependencies, build output, runtime state and wallet keypairs. Keep Google OAuth client JSON and any other credentials out of the repository as well. Environment values configured on Sites are not transferred to GitHub; other developers must configure their own environment.

Only the app directory belongs in the repository. Do not upload the parent `.tools` folder, Desktop OAuth downloads, local `.wrangler` state, or deployment archives. A GitHub repository is source sharing; pushing to it does not automatically deploy the site.

Official guide: https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github
