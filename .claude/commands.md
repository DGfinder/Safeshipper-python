Explore
First, use parallel subagents to find and read all files that may be useful for implementing the ticket, either as examples or as edit targets. The subagents should return relevant file paths, and any other info that may be useful.

Plan
Next, think hard and write up a detailed implementation plan. Don't forget to include tests, lookbook components, and documentation. Use your judgement as to what is necessary, given the standards of this repo.

If there are things you are not sure about, use parallel subagents to do some web research. They should only return useful information, no noise.

If there are things you still do not understand or questions you have for the user, pause here to ask them before continuing.

Code
When you have a thorough implementation plan, you are ready to start writing code. Follow the style of the existing codebase (e.g. we prefer clearly named variables and methods to extensive comments). Make sure to run our autoformatting script when you're done, and fix linter warnings that seem reasonable to you.

Test
Use parallel subagents to run tests, and make sure they all pass.

If your changes touch the UX in a major way, use the browser to make sure that everything works correctly. Make a list of what to test for, and use a subagent for this step.

If your testing shows problems, go back to the planning stage and think ultrahard.

Write up your work
When you are happy with your work, write up a short report that could be used as the PR description. Include what you set out to do, the choices you made with their brief justification, and any commands you ran in the process that may be useful for future developers to know about.

/update-docs
Comprehensively update all project documentation to reflect current codebase state. Use the documentation-maintainer sub agent to analyze code changes, update version numbers, refresh feature lists, validate setup instructions, and ensure all documentation is current and accurate. 

Usage:
- `/update-docs` - Update all documentation
- `/update-docs core` - Update core docs (README.md, CLAUDE.md, DEPLOYMENT.md, SECURITY.md)
- `/update-docs api` - Update API documentation and implementation summaries
- `/update-docs frontend` - Update frontend-specific documentation
- `/update-docs backend` - Update backend-specific documentation
- `/update-docs mobile` - Update mobile app documentation
- `/update-docs security` - Update security and compliance documentation
- `/update-docs --dry-run` - Show what would be updated without making changes
- `/update-docs --specific=README.md` - Update only specific file

The documentation-maintainer will:
1. Scan recent code changes to identify what documentation needs updating
2. Update version numbers from package.json, requirements.txt, etc.
3. Refresh feature lists and capability descriptions
4. Validate and update setup instructions
5. Check for new API endpoints, components, or architectural changes
6. Ensure consistency across all documentation files
7. Validate links and references
8. Maintain enterprise-grade documentation standards

This ensures SafeShipper documentation stays current with the evolving platform and maintains professional standards for enterprise deployment.