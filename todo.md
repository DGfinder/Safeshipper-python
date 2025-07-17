# Task: Fix Vercel Build Error - DOMMatrix is not defined

## Plan

- [x] **Step 1:** Update SDSViewerModal to use dynamic import for SDSDocumentPreview component
- [x] **Step 2:** Add loading state for the dynamically imported component
- [x] **Step 3:** Test the build locally to ensure error is resolved

---
## Security Review

- **Input Validation:** Not Applicable - No new user inputs added
- **Permissions Check:** Not Applicable - No permission changes
- **Data Exposure:** Not Applicable - No new data exposed
- **New Dependencies:** None

---
## Review Summary

The Vercel build error has been successfully resolved. The issue was caused by the `react-pdf` library attempting to access browser-specific APIs (DOMMatrix) during Next.js static generation phase.

### Changes Made:
1. **Modified:** `/frontend/src/shared/components/sds/SDSViewerModal.tsx`
   - Replaced static import with dynamic import for SDSDocumentPreview component
   - Added `{ ssr: false }` option to prevent server-side rendering
   - Added Loader2 icon and loading state for better UX
   
### Result:
- Build completes successfully without errors
- `/sds-library` page is now properly generated as static content
- No functionality changes - the component works exactly as before
- Loading spinner shown briefly while the PDF component loads

The fix is minimal and targeted, addressing only the specific SSR issue without affecting the rest of the application.