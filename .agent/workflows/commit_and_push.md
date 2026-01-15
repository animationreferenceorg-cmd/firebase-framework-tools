---
description: Commit and push all changes to the remote repository without manual confirmation.
---

// turbo-all

1. Check the git status to see what's changed.
   git status

2. Add all changes to the staging area.
   git add .

3. Commit the changes.
   git commit -m "chore: auto-commit pending changes"

4. Push the changes to the 'main' branch.
   git push origin main
