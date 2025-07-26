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

/optimize-aiml
Optimize SafeShipper's AI/ML systems and machine learning pipelines. Use the aiml-operations-specialist sub agent to enhance dangerous goods detection models, improve predictive analytics, and manage NLP processing for transport operations.

Usage:
- `/optimize-aiml` - Comprehensive AI/ML system optimization
- `/optimize-aiml models` - Focus on model performance and accuracy
- `/optimize-aiml data` - Optimize training data quality and pipelines
- `/optimize-aiml inference` - Improve real-time inference performance
- `/optimize-aiml dangerous-goods` - Enhance dangerous goods detection accuracy
- `/optimize-aiml nlp` - Optimize spaCy models and text processing
- `/optimize-aiml predictions` - Improve predictive analytics models

The aiml-operations-specialist will:
1. Analyze model performance metrics and accuracy
2. Optimize training data quality and feature engineering
3. Enhance dangerous goods classification algorithms
4. Improve inference times and resource utilization
5. Monitor model drift and retraining requirements
6. Scale AI/ML infrastructure for production loads
7. Implement A/B testing for model improvements

/manage-infrastructure
Manage and optimize SafeShipper's infrastructure, containers, and deployment systems. Use the devops-infrastructure-expert sub agent for Docker optimization, Kubernetes scaling, CI/CD enhancement, and monitoring improvements.

Usage:
- `/manage-infrastructure` - Comprehensive infrastructure optimization
- `/manage-infrastructure containers` - Optimize Docker images and containerization
- `/manage-infrastructure kubernetes` - Enhance Kubernetes deployments and scaling
- `/manage-infrastructure monitoring` - Improve Prometheus/Grafana monitoring
- `/manage-infrastructure cicd` - Optimize CI/CD pipelines and automation
- `/manage-infrastructure security` - Enhance infrastructure security and compliance
- `/manage-infrastructure scaling` - Implement auto-scaling and capacity planning

The devops-infrastructure-expert will:
1. Assess current infrastructure health and performance
2. Optimize container images and multi-stage builds
3. Enhance Kubernetes configurations and resource allocation
4. Improve monitoring dashboards and alerting systems
5. Streamline CI/CD pipelines and deployment automation
6. Implement security best practices and compliance
7. Plan capacity scaling and cost optimization

/optimize-data-pipeline
Optimize SafeShipper's data pipelines, ETL processes, and data quality management. Use the data-pipeline-etl-specialist sub agent for manifest processing, GPS tracking optimization, and data warehouse improvements.

Usage:
- `/optimize-data-pipeline` - Comprehensive data pipeline optimization
- `/optimize-data-pipeline manifest` - Optimize manifest processing and validation
- `/optimize-data-pipeline gps` - Enhance real-time GPS tracking pipelines
- `/optimize-data-pipeline quality` - Improve data quality monitoring and validation
- `/optimize-data-pipeline etl` - Optimize extract, transform, load processes
- `/optimize-data-pipeline streaming` - Enhance real-time data streaming
- `/optimize-data-pipeline warehouse` - Optimize data warehouse and analytics

The data-pipeline-etl-specialist will:
1. Analyze data flow performance and bottlenecks
2. Optimize manifest processing speed and accuracy
3. Enhance real-time GPS tracking data pipelines
4. Improve dangerous goods detection and validation
5. Monitor data quality metrics and implement alerts
6. Scale processing capacity for high-volume operations
7. Ensure compliance with transport data regulations

/manage-integrations
Manage SafeShipper's external system integrations and API orchestration. Use the integration-api-orchestrator sub agent for ERP connections, government APIs, carrier networks, and third-party services.

Usage:
- `/manage-integrations` - Comprehensive integration management
- `/manage-integrations erp` - Manage ERP system connections (SAP, Oracle, etc.)
- `/manage-integrations government` - Optimize government API integrations
- `/manage-integrations carriers` - Manage carrier network connections
- `/manage-integrations apis` - Monitor and optimize API performance
- `/manage-integrations sync` - Improve data synchronization processes
- `/manage-integrations monitoring` - Enhance integration health monitoring

The integration-api-orchestrator will:
1. Monitor integration health and performance metrics
2. Optimize API call patterns and response times
3. Manage authentication tokens and credential renewal
4. Ensure bidirectional data synchronization integrity
5. Implement intelligent retry mechanisms and error handling
6. Scale integration infrastructure for enterprise loads
7. Maintain compliance with external system requirements

/analyze-business-intelligence
Generate strategic business intelligence and analytics insights for SafeShipper leadership. Use the business-intelligence-expert sub agent for executive dashboards, market analysis, and strategic recommendations.

Usage:
- `/analyze-business-intelligence` - Comprehensive BI analysis and reporting
- `/analyze-business-intelligence dashboard` - Generate executive KPI dashboards
- `/analyze-business-intelligence market` - Analyze market trends and opportunities
- `/analyze-business-intelligence performance` - Review operational performance metrics
- `/analyze-business-intelligence growth` - Identify growth opportunities and strategies
- `/analyze-business-intelligence risks` - Assess market risks and mitigation strategies
- `/analyze-business-intelligence forecasting` - Generate predictive analytics and forecasts

The business-intelligence-expert will:
1. Generate real-time executive KPI dashboards
2. Analyze dangerous goods market trends and positioning
3. Identify growth opportunities and expansion potential
4. Assess competitive landscape and strategic positioning
5. Provide data-driven strategic recommendations
6. Monitor key performance indicators against targets
7. Create predictive models for business planning