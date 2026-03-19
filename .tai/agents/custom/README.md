# Custom Team Agents

Place team-specific agent definitions here. Each agent is a markdown file.

## Agent File Format

```markdown
# Agent Name

Description of what this agent does.

## Tools
List of tools this agent can use.

## Instructions
Behavioral instructions for the agent.
```

## Registration

Custom agents are automatically discovered by Claude Code when placed in this directory.
No registration in packages.yaml needed — custom agents are always available.
