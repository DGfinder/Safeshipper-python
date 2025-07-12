# MCP Tools Setup for SafeShipper Project

This document explains how to set up and use the Model Context Protocol (MCP) tools that have been added to your SafeShipper project.

## 📁 Project Structure

```
SafeShipper Home/
├── mcp-tools/
│   ├── SuperClaude/              # Enhanced Claude Code framework
│   ├── mcp-manim/                # Mathematical animation engine
│   └── Context-Engineering-Intro/ # Context engineering templates
├── claude_desktop_config.json    # MCP server configuration
└── MCP_SETUP.md                 # This documentation
```

## 🛠️ Installed MCP Tools

### 1. SuperClaude Framework
**Location**: `mcp-tools/SuperClaude/`
**Purpose**: Enhanced development framework for Claude Code with specialized commands and personas

**Key Features**:
- 18 specialized commands for development lifecycle
- 9 cognitive personas for domain-specific approaches
- Token optimization and compression options
- Evidence-based methodology
- Git checkpoint support

**Installation**:
```bash
cd mcp-tools/SuperClaude
./install.sh
```

### 2. MCP Manim Integration
**Location**: `mcp-tools/mcp-manim/`
**Purpose**: Create mathematical animations and visualizations programmatically

**Key Features**:
- Containerized Manim execution
- Multiple output formats (MP4, GIF, PNG)
- Quality settings from 360p to 4K
- Docker-based isolation

**Setup**:
```bash
cd mcp-tools/mcp-manim
docker-compose build
docker-compose up -d
```

### 3. Context Engineering Framework
**Location**: `mcp-tools/Context-Engineering-Intro/`
**Purpose**: Template and methodology for effective AI context engineering

**Key Features**:
- PRP (Product Requirements Prompt) generation
- Comprehensive context templates
- Best practices for AI assistance
- Example-driven development

## 🔧 Claude Desktop Configuration

The `claude_desktop_config.json` file configures the following MCP servers:

### Filesystem Server
- **Purpose**: Direct file system access for Claude Desktop
- **Scope**: SafeShipper project directories (frontend, backend, mobile, mcp-tools)

### Manim Server
- **Purpose**: Mathematical animation creation
- **Requirements**: Docker container must be running
- **Usage**: Create animations from Python code

### Git Server
- **Purpose**: Enhanced git operations and repository management
- **Scope**: SafeShipper project root

### Memory Server
- **Purpose**: Persistent memory across Claude Desktop sessions

## 🚀 Getting Started

### Step 1: Install SuperClaude (Optional)
```bash
cd mcp-tools/SuperClaude
./install.sh
```

This installs enhanced commands to `~/.claude/` directory.

### Step 2: Set Up Manim (Requires Docker)
**Note**: Docker is not currently available in this environment. To use Manim:

1. Install Docker Desktop on your Windows machine
2. Set up the Manim server:
```bash
cd mcp-tools/mcp-manim
docker-compose build
docker-compose up -d

# Test the installation
docker-compose exec mcp-manim-server python3 -c "
import manim
print('✅ Manim version:', manim.__version__)
print('✅ Server ready for animations!')
"
```

3. Update `claude_desktop_config.json` to include the Manim server configuration:
```json
"manim": {
  "command": "docker",
  "args": [
    "exec",
    "-i", 
    "mcp-manim-server",
    "python3",
    "/workspace/run_server.py"
  ],
  "cwd": "/mnt/c/Users/Hayden/Desktop/Safeshipper Home/mcp-tools/mcp-manim"
}
```

### Step 3: Configure Claude Desktop
1. Copy the `claude_desktop_config.json` to Claude Desktop's configuration directory:
   - **Windows**: `%APPDATA%/Claude/claude_desktop_config.json`
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Restart Claude Desktop

3. Look for the MCP server icons in the Claude Desktop interface

## 📖 Usage Examples

### Using SuperClaude Commands
After installation, you can use specialized commands in Claude Code:

```bash
# Architecture analysis with architect persona
/analyze --code --persona-architect

# Build React component with frontend persona  
/build --react --magic --persona-frontend

# Security scan with security persona
/scan --security --owasp --persona-security

# Performance troubleshooting
/troubleshoot --prod --five-whys --persona-performance
```

### Creating Animations with Manim
Request mathematical animations through Claude Desktop:

```python
# Example: Create a simple animation
from manim import *

class HelloWorld(Scene):
    def construct(self):
        text = Text("SafeShipper Analytics", font_size=48)
        self.play(Write(text))
        self.wait()
```

### Using Context Engineering
Reference the context engineering templates:

1. Edit `mcp-tools/Context-Engineering-Intro/INITIAL.md` with your feature request
2. Use `/generate-prp INITIAL.md` to create comprehensive requirements
3. Use `/execute-prp PRPs/your-feature.md` to implement the feature

## 🔍 Verification

### Check MCP Server Status
In Claude Desktop, look for:
- 🔨 Hammer icon (tools available)
- 📁 Folder icon (filesystem access)
- Additional server indicators

### Test Filesystem Access
Claude Desktop should now have direct access to:
- `/mnt/c/Users/Hayden/Desktop/Safeshipper Home/frontend/`
- `/mnt/c/Users/Hayden/Desktop/Safeshipper Home/backend/`
- `/mnt/c/Users/Hayden/Desktop/Safeshipper Home/mobile/`
- `/mnt/c/Users/Hayden/Desktop/Safeshipper Home/mcp-tools/`

### Test Manim Integration
```bash
# Check if container is running
docker-compose ps

# Should show mcp-manim-server as "Up"
```

## 🛡️ Security Considerations

1. **File Access**: MCP servers have access to specified directories only
2. **Container Isolation**: Manim runs in Docker for security
3. **Trusted Sources**: All tools are from reputable open-source projects
4. **Review Code**: Always review generated code before execution

## 🔧 Troubleshooting

### MCP Servers Not Appearing
1. Verify `claude_desktop_config.json` is in the correct location
2. Restart Claude Desktop completely
3. Check that all paths in the config exist

### Manim Container Issues
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs mcp-manim-server

# Restart if needed
docker-compose restart
```

### SuperClaude Commands Not Working
```bash
# Verify installation
ls -la ~/.claude/commands/

# Reinstall if needed
cd mcp-tools/SuperClaude
./install.sh --update
```

## 📚 Additional Resources

- [SuperClaude Documentation](mcp-tools/SuperClaude/README.md)
- [Manim Documentation](https://docs.manim.community/)
- [Context Engineering Guide](mcp-tools/Context-Engineering-Intro/README.md)
- [MCP Official Documentation](https://modelcontextprotocol.io/)

## 🎯 Next Steps

1. Explore the SuperClaude commands for your development workflow
2. Try creating visualizations with Manim for your shipment analytics
3. Use context engineering principles for complex feature development
4. Leverage the enhanced file system access in Claude Desktop

The MCP tools are now ready to enhance your SafeShipper development experience!