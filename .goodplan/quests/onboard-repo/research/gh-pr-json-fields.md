# gh pr list/view JSON Fields

**Version**: gh CLI 2.x | **Fetched**: 2026-03-28

## Review-related fields (both `gh pr list` and `gh pr view`)
- `reviews` — full list of reviews (state, author, body, submittedAt)
- `latestReviews` — most recent review per reviewer
- `reviewRequests` — pending review requests
- `reviewDecision` — overall: APPROVED, CHANGES_REQUESTED, REVIEW_REQUIRED
- `comments` — general PR comments (NOT inline code review comments)

## NOT valid
- `reviewComments` — does not exist

## Inline review comments
Not available via `--json`. Use:
- `gh api repos/{owner}/{repo}/pulls/{number}/comments` — REST API for inline review comments
- `gh pr view {number} --comments` — text view

## Recommended approach for onboard-repo
- `gh pr list --limit 20 --json number,title,labels,reviews,reviewDecision` — overview
- `gh pr view {number} --json reviews,comments,body` — details per PR
- `gh api repos/{owner}/{repo}/pulls/{number}/comments` — inline review comments for expertise analysis
