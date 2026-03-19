#!/usr/bin/env python3
"""Generate TAI Execution Plan DOCX"""

from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
import os

doc = Document()
style = doc.styles['Normal']
font = style.font
font.name = 'Arial'
font.size = Pt(11)

def add_heading(text, level=1):
    h = doc.add_heading(text, level=level)
    for run in h.runs:
        run.font.color.rgb = RGBColor(0x1B, 0x2A, 0x4A)
    return h

def add_para(text, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = bold
    run.italic = italic
    return p

def add_table(headers, rows):
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.style = 'Light Grid Accent 1'
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for i, h in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = h
        for p in cell.paragraphs:
            for run in p.runs:
                run.bold = True
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row):
            table.rows[r_idx + 1].cells[c_idx].text = str(val)
    doc.add_paragraph()
    return table

def add_code_block(text):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.name = 'Courier New'
    run.font.size = Pt(9)
    p.paragraph_format.left_indent = Inches(0.5)
    return p

def add_bullet(text, bold_prefix=None):
    p = doc.add_paragraph(style='List Bullet')
    if bold_prefix:
        r = p.add_run(bold_prefix)
        r.bold = True
        p.add_run(' ' + text)
    else:
        p.add_run(text)
    return p

def add_check(text):
    p = doc.add_paragraph()
    p.add_run('\u2610 ' + text)
    p.paragraph_format.left_indent = Inches(0.3)
    return p

# ============================================================
# COVER PAGE
# ============================================================
doc.add_paragraph()
doc.add_paragraph()

title = doc.add_paragraph()
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = title.add_run('TAI Execution Plan')
r.font.size = Pt(32)
r.bold = True
r.font.color.rgb = RGBColor(0x1B, 0x2A, 0x4A)

doc.add_paragraph()

subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = subtitle.add_run('7-Sprint Implementation Roadmap')
r.font.size = Pt(18)
r.font.color.rgb = RGBColor(0x1B, 0x2A, 0x4A)

doc.add_paragraph()

tagline = doc.add_paragraph()
tagline.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tagline.add_run('Based on TAI Architecture Specification v1.1')
r.italic = True
r.font.size = Pt(12)

doc.add_paragraph()

info = doc.add_paragraph()
info.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = info.add_run('Jinks Labs\nMarch 2026')
r.font.size = Pt(11)

doc.add_page_break()

# ============================================================
# EXECUTIVE SUMMARY
# ============================================================
add_heading('Executive Summary')

doc.add_paragraph(
    'This execution plan breaks the TAI Architecture Spec v1.1 into 7 sprints, sequenced by '
    'dependency ordering. The critical path flows from foundation through enforcement, telemetry, '
    'and observability. Skills are independent of hooks and can be built in parallel with the '
    'enforcement layer.'
)

doc.add_paragraph(
    'Total estimated effort: 58 hours of AI-assisted development across 7 sprints. '
    'At 2 weeks per sprint, the full TAI framework ships in 14 weeks (3.5 months). '
    'At 1 week per sprint (aggressive), it ships in 7 weeks.'
)

add_heading('Dependency Graph', level=2)

add_code_block(
    'Sprint 1: Foundation + Session Protocol\n'
    '    \u2502\n'
    '    \u251c\u2500\u2500\u2500\u2500 Sprint 2: Enforcement Layer\n'
    '    \u2502         \u2502\n'
    '    \u2502         \u2514\u2500\u2500\u2500\u2500 Sprint 4: Telemetry Pipeline\n'
    '    \u2502                   \u2502\n'
    '    \u2502                   \u251c\u2500\u2500\u2500\u2500 Sprint 5: Observability\n'
    '    \u2502                   \u2502\n'
    '    \u2502                   \u2514\u2500\u2500\u2500\u2500 Sprint 6: Notifications + Migration\n'
    '    \u2502\n'
    '    \u2514\u2500\u2500\u2500\u2500 Sprint 3: Skill Library (parallel with Sprint 2)\n'
    '    \n'
    'Sprint 7: Integration + Launch (depends on all above)'
)

add_heading('Sprint Overview', level=2)

add_table(
    ['Sprint', 'Name', 'Hours', 'Depends On', 'Spec Sections'],
    [
        ['1', 'Foundation + Session Protocol', '10', 'None', '3.1, 3.2, 3.3, 4, 7, 9'],
        ['2', 'Enforcement Layer', '10', 'Sprint 1', '6.1, 6.2, 6.3'],
        ['3', 'Skill Library', '8', 'Sprint 1', '5.1, 5.2'],
        ['4', 'Telemetry Pipeline', '8', 'Sprint 2', '6.4, 6.5'],
        ['5', 'Observability', '8', 'Sprint 4', '8.1, 8.2, 8.3'],
        ['6', 'Notifications + Migration', '6', 'Sprint 4', '8.4, 9.3, 10.2, 10.3'],
        ['7', 'Integration + Launch', '8', 'Sprints 1-6', '13'],
    ]
)

# ============================================================
# SPRINT 1
# ============================================================
doc.add_page_break()
add_heading('Sprint 1: Foundation + Session Protocol')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Establish the .tai/ directory structure, fork and strip PAI, implement CORE.md session '
    'initialization with role identification, and create all configuration templates.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('10 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('None (this is the foundation)')

add_heading('Deliverables', level=2)

add_table(
    ['File / Directory', 'Description', 'Source'],
    [
        ['.tai/', 'Root directory (committed to repo)', 'New'],
        ['.tai/CORE.md', 'Session initialization protocol with role routing', 'Adapted from PAI'],
        ['.tai/VERSION', 'Semver manifest, initial value 1.0.0', 'New'],
        ['.tai/config/team.yaml', 'Team roles, members, notification config (template)', 'New'],
        ['.tai/config/project.yaml', 'Project metadata and stack definition', 'New'],
        ['.tai/config/models.yaml', 'Model selection per task type', 'New'],
        ['.tai/context/architecture.md', 'System architecture reference (empty template)', 'New'],
        ['.tai/context/boundaries.md', 'Hard architectural boundaries (empty template)', 'New'],
        ['.tai/context/patterns.md', 'Code patterns and conventions (empty template)', 'New'],
        ['.tai/context/sprint-current.md', 'Current sprint objectives + ISC (template)', 'New'],
        ['.tai/roles/architect.md', 'Architect session context, skills, boundaries', 'New'],
        ['.tai/roles/developer.md', 'Developer session context, skills, boundaries', 'New'],
        ['.tai/roles/qa.md', 'QA/Test session context, skills, boundaries', 'New'],
        ['.tai/templates/sprint-isc.md', 'ISC definition template for sprint planning', 'New'],
        ['.tai/templates/boundaries-example.md', 'Example boundary configuration', 'New'],
        ['.tai/telemetry/', 'Empty directory for JSONL logs', 'New'],
        ['.tai/skills/', 'Empty skill directories (development/, quality/, architecture/, project/)', 'New'],
        ['.tai/hooks/', 'Empty hooks directory (populated in Sprint 2)', 'New'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Role Identification in CORE.md: ')
r.bold = True
p.add_run(
    'CORE.md reads git config user.email and matches against team.yaml entries. '
    'If TAI_ROLE env var is set, it overrides the git email lookup. If neither resolves, '
    'defaults to "developer" role with a warning logged to telemetry.'
)

p = doc.add_paragraph()
r = p.add_run('PAI Fork: ')
r.bold = True
p.add_run(
    'Clone PAI repo. Remove: personal identity, life goals, personal knowledge base, '
    'individual model routing, personal contacts, ElevenLabs TTS. Keep: CORE skill structure, '
    'skill system, structured response format, workflow routing, hook system, observability logging.'
)

add_heading('Acceptance Criteria', level=2)

add_check('Directory structure matches Spec Section 3.1 exactly')
add_check('CORE.md loads and identifies role via git user.email')
add_check('TAI_ROLE env var overrides git email lookup')
add_check('Unknown email defaults to "developer" role')
add_check('Role context files load different content per role (architect vs developer vs QA)')
add_check('sprint-current.md template follows Spec Section 7.1 format')
add_check('team.yaml is generic (no project-specific names or emails)')
add_check('VERSION file contains "1.0.0"')
add_check('.tai/ directory is under 40 files (excluding telemetry)')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#1, #2, #3, #14, #15, #16, #19')

# ============================================================
# SPRINT 2
# ============================================================
doc.add_page_break()
add_heading('Sprint 2: Enforcement Layer')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Implement all 4 enforcement hooks (pre-commit, pre-push, pre-pr, post-session), '
    'the architecture boundary analysis engine, and the bypass-with-reason protocol.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('10 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('Sprint 1 (directory structure, config files, boundaries.md)')

add_heading('Deliverables', level=2)

add_table(
    ['File', 'Description'],
    [
        ['.tai/hooks/pre-commit.sh', 'Runs linter, type checker, and import boundary scan on staged files'],
        ['.tai/hooks/pre-push.sh', 'Runs full test suite before push'],
        ['.tai/hooks/pre-pr.sh', 'Combines pre-commit + pre-push + build + PR description validation'],
        ['.tai/hooks/post-session.sh', 'Generates session summary and writes to sessions.jsonl'],
        ['.tai/hooks/boundary-scan.sh', 'Grep-based static analysis for forbidden import paths'],
        ['.tai/hooks/bypass-handler.sh', 'Intercepts --no-verify, prompts for reason, logs to hooks.jsonl'],
        ['Git hook installation script', 'Installs .tai/hooks/ as git hooks on first setup'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Boundary Analysis: ')
r.bold = True
p.add_run(
    'Reads forbidden import rules from .tai/context/boundaries.md. Parses staged files for import/require '
    'statements. If any staged file introduces a forbidden import path, exits with code 1 and a clear '
    'error message identifying the file and violation.'
)

p = doc.add_paragraph()
r = p.add_run('Bypass Protocol: ')
r.bold = True
p.add_run(
    'When --no-verify is detected, the bypass handler prompts the developer for a mandatory reason string. '
    'The bypass event and reason are both written to .tai/telemetry/hooks.jsonl. This is implemented as a '
    'wrapper that checks if the standard hooks were skipped.'
)

p = doc.add_paragraph()
r = p.add_run('Crash Policy: ')
r.bold = True
p.add_run(
    'If a hook script crashes (non-zero exit from unexpected error, not a check failure), the action is '
    'blocked. Conservative approach forces immediate fix of broken enforcement infrastructure.'
)

add_heading('Acceptance Criteria', level=2)

add_check('pre-commit hook blocks commits with linting errors')
add_check('pre-commit hook blocks commits with type-check failures')
add_check('pre-commit hook blocks commits with boundary violations')
add_check('Boundary violation message identifies the file and forbidden import path')
add_check('Boundary violation logged to .tai/telemetry/boundaries.jsonl')
add_check('pre-push hook blocks pushes with failing tests')
add_check('pre-pr runs full pipeline (lint + type + boundary + test + build)')
add_check('Hook bypass prompts for mandatory reason string')
add_check('Bypass event and reason written to hooks.jsonl')
add_check('Hook crash (not failure) blocks the action')
add_check('post-session hook writes session summary to sessions.jsonl')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#4, #5, #6, #7')

# ============================================================
# SPRINT 3
# ============================================================
doc.add_page_break()
add_heading('Sprint 3: Skill Library')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Write all 11 core skills as markdown workflow definitions with triggers, pre-conditions, '
    'step-by-step procedures, and verification gates.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('8 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('Sprint 1 (role system for skill access control, skill directory structure)')

p = doc.add_paragraph()
r = p.add_run('Parallelism: ')
r.bold = True
p.add_run('Can run in parallel with Sprint 2 (skills and hooks are independent)')

add_heading('Deliverables', level=2)

add_table(
    ['File', 'Skill', 'Category'],
    [
        ['.tai/skills/development/new-endpoint.md', 'Scaffold API route', 'Development'],
        ['.tai/skills/development/new-component.md', 'Scaffold UI component', 'Development'],
        ['.tai/skills/development/new-migration.md', 'Numbered SQL migration', 'Development'],
        ['.tai/skills/development/formula-work.md', 'Formula/calculation protocol', 'Development'],
        ['.tai/skills/quality/pre-pr.md', 'Full verification pipeline', 'Quality'],
        ['.tai/skills/quality/security-check.md', 'Role matrix compliance', 'Quality'],
        ['.tai/skills/quality/test-generation.md', 'Test generation from specs', 'Quality'],
        ['.tai/skills/architecture/review-pr.md', 'PR review protocol', 'Architecture'],
        ['.tai/skills/architecture/boundary-audit.md', 'Cross-module import analysis', 'Architecture'],
        ['.tai/skills/architecture/sprint-planning.md', 'ISC + task breakdown', 'Architecture'],
        ['.tai/skills/project/sprint-init.md', 'Sprint initialization', 'Project'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Skill Structure: ')
r.bold = True
p.add_run(
    'Every skill follows the standard anatomy from Spec Section 5.2: Trigger, Pre-conditions, Steps '
    '(numbered), and Verification Gate (checkbox list). Skills are generic \u2014 they reference project '
    'conventions from .tai/context/patterns.md, not hardcoded project paths.'
)

p = doc.add_paragraph()
r = p.add_run('Role Gating: ')
r.bold = True
p.add_run(
    'Each skill\'s role access is defined in the skill file header and cross-referenced with the role '
    'context files. CORE.md only loads skills available to the current role.'
)

p = doc.add_paragraph()
r = p.add_run('Telemetry: ')
r.bold = True
p.add_run(
    'Each skill\'s final step logs completion to .tai/telemetry/sessions.jsonl with skill name, duration, '
    'and files touched. This prepares for Sprint 4\'s telemetry pipeline.'
)

add_heading('Acceptance Criteria', level=2)

add_check('All 11 skills exist as .md files in correct subdirectories')
add_check('Each skill has: Trigger, Pre-conditions, Steps, Verification Gate')
add_check('/new-endpoint produces a complete API route workflow')
add_check('/pre-pr runs the full verification pipeline workflow')
add_check('Skills are generic (no project-specific paths or names)')
add_check('Role gating is defined per skill (matches Spec Section 5.1 table)')
add_check('Each skill logs completion to telemetry as its final step')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#8, #9')

# ============================================================
# SPRINT 4
# ============================================================
doc.add_page_break()
add_heading('Sprint 4: Telemetry Pipeline')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Implement the JSONL telemetry schema, wire hooks and sessions to emit structured events, '
    'and build the GitHub Action that aggregates telemetry on push.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('8 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('Sprint 2 (hooks must exist to emit telemetry)')

add_heading('Deliverables', level=2)

add_table(
    ['File', 'Description'],
    [
        ['.tai/telemetry/sessions.jsonl', 'Session start/end events with role, duration, skills used'],
        ['.tai/telemetry/hooks.jsonl', 'Hook execution events with result, duration, bypass reason'],
        ['.tai/telemetry/boundaries.jsonl', 'Boundary violation events with file, import path, user'],
        ['.tai/telemetry/ai-usage.jsonl', 'Model/token usage estimates per session'],
        ['.github/workflows/tai-aggregate.yml', 'GitHub Action: triggers on push to .tai/telemetry/**, aggregates to summary JSON'],
        ['.tai/telemetry/summary.json', 'Aggregated metrics (output of GitHub Action)'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Event Schema: ')
r.bold = True
p.add_run(
    'All events follow the schema from Spec Section 6.4: timestamp, event type, user, role, result, '
    'bypass_reason (nullable), and details object. Schema is consistent across all JSONL files.'
)

p = doc.add_paragraph()
r = p.add_run('Git Transport: ')
r.bold = True
p.add_run(
    'Telemetry files are committed alongside code changes. The post-session hook auto-stages telemetry '
    'files. No separate sync infrastructure \u2014 git is the transport layer.'
)

p = doc.add_paragraph()
r = p.add_run('GitHub Action Aggregation: ')
r.bold = True
p.add_run(
    'A GitHub Action triggers on push to .tai/telemetry/**. It reads raw JSONL, computes aggregate '
    'metrics (per-sprint, per-developer, per-day), deduplicates by timestamp + user + event hash, '
    'and commits summary.json back to the repo.'
)

add_heading('Acceptance Criteria', level=2)

add_check('Every hook execution writes a structured JSONL event')
add_check('Session start/end events written to sessions.jsonl')
add_check('Boundary violations written to boundaries.jsonl')
add_check('AI usage estimates written to ai-usage.jsonl')
add_check('Bypass events include reason string in hooks.jsonl')
add_check('Telemetry files auto-staged by post-session hook')
add_check('GitHub Action triggers on push to .tai/telemetry/**')
add_check('GitHub Action produces valid summary.json with aggregate metrics')
add_check('Duplicate events are deduplicated by the Action')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#10, #11')

# ============================================================
# SPRINT 5
# ============================================================
doc.add_page_break()
add_heading('Sprint 5: Observability')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Build the CLI status line that displays session health in the terminal, and implement '
    'all 6 slash commands that query telemetry data.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('8 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('Sprint 4 (telemetry data must exist to display/query)')

add_heading('Deliverables', level=2)

add_table(
    ['File / Feature', 'Description'],
    [
        ['CLI Status Line', 'Persistent terminal bar showing: role, sprint, ISC progress, hook status, session duration, TAI version, boundary status'],
        ['/tai-sessions skill', 'Query session activity: who worked today, duration, skills used'],
        ['/tai-bypasses skill', 'Query hook bypass log with reasons, filterable by sprint/developer'],
        ['/tai-boundaries skill', 'Query boundary violation history'],
        ['/tai-sprint skill', 'Query sprint ISC progress, task assignments, days remaining'],
        ['/tai-health skill', 'Query code health: test count trend, type safety, dependency audit'],
        ['/tai-usage skill', 'Query AI usage: model split, token spend estimate, session counts'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Status Line: ')
r.bold = True
p.add_run(
    'Renders a single persistent bar at the bottom of the Claude Code terminal. '
    'Updates after every hook execution, skill invocation, or telemetry write. '
    'Color coding: green (PASS/healthy), red (FAIL), yellow (BYPASS/warning). '
    'ISC progress color: green (>75%), yellow (25-75%), red (<25%).'
)

p = doc.add_paragraph()
r = p.add_run('Slash Commands: ')
r.bold = True
p.add_run(
    'Implemented as TAI skills (markdown workflow files) that parse JSONL telemetry data. '
    'Privacy model: developers see their own metrics only. The architect sees aggregate team data. '
    'Commands use jq or equivalent to query and format JSONL output.'
)

add_heading('Acceptance Criteria', level=2)

add_check('Status line displays current role')
add_check('Status line displays sprint name')
add_check('Status line displays ISC progress (N/M format)')
add_check('Status line displays hook status with color coding')
add_check('Status line displays session duration')
add_check('Status line displays TAI version from .tai/VERSION')
add_check('Status line displays boundary violation count')
add_check('/tai-sessions returns session activity data')
add_check('/tai-bypasses returns bypass log with reasons')
add_check('/tai-boundaries returns violation history')
add_check('/tai-sprint returns ISC progress and days remaining')
add_check('/tai-health returns code health summary')
add_check('/tai-usage returns AI usage metrics')
add_check('Developer can only see own metrics in /tai-sessions and /tai-usage')
add_check('Architect sees all team metrics')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#12, #13')

# ============================================================
# SPRINT 6
# ============================================================
doc.add_page_break()
add_heading('Sprint 6: Notifications + Migration')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Implement the webhook notification system for team channels, migrate content from '
    'existing CLAUDE.md files into .tai/context/, and finalize the PR template and versioning.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('6 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('Sprint 4 (telemetry events trigger notifications)')

add_heading('Deliverables', level=2)

add_table(
    ['File / Feature', 'Description'],
    [
        ['.tai/hooks/notify.sh', 'Webhook notification sender (Teams/Slack/Discord)'],
        ['Notification routing logic', 'Routes events to correct recipients per team.yaml config'],
        ['.tai/templates/pr-description.md', 'PR template with AI usage disclosure section'],
        ['CLAUDE.md migration guide', 'Instructions for extracting content to .tai/context/ files'],
        ['CLAUDE.md reference line', 'One-liner pointing to .tai/ added to project CLAUDE.md'],
        ['.tai/VERSION semver workflow', 'Bump process documented, CORE.md version check on init'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Notification System: ')
r.bold = True
p.add_run(
    'Reads webhook URL and platform (Teams/Slack/Discord) from team.yaml. Posts structured '
    'notifications on: PR ready for review, boundary violation blocked, hook bypass detected, '
    'sprint ISC completion, build failure on main. Routes DMs vs channel posts per routing config.'
)

p = doc.add_paragraph()
r = p.add_run('CLAUDE.md Migration: ')
r.bold = True
p.add_run(
    'Extracts architecture boundaries, code patterns, sprint context, and system architecture '
    'from existing CLAUDE.md into .tai/context/ files. CLAUDE.md retains: project name, tech '
    'stack summary, build/run commands, directory overview, and a reference line to .tai/.'
)

add_heading('Acceptance Criteria', level=2)

add_check('Webhook posts to configured channel on boundary violation')
add_check('Webhook posts on PR ready for review')
add_check('Webhook posts on sprint ISC completion')
add_check('Notification routing sends DMs to correct recipients')
add_check('PR template includes AI usage disclosure section')
add_check('CLAUDE.md migration guide documents what moves and what stays')
add_check('CLAUDE.md retains base project rules after migration')
add_check('CLAUDE.md includes reference line to .tai/')
add_check('VERSION bump process is documented')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('#9 (PR desc), #14 (sprint context), #15 (VERSION)')

# ============================================================
# SPRINT 7
# ============================================================
doc.add_page_break()
add_heading('Sprint 7: Integration + Launch')

p = doc.add_paragraph()
r = p.add_run('Objective: ')
r.bold = True
p.add_run(
    'Perform full integration testing as each role, write onboarding documentation, '
    'and verify all 19 spec acceptance criteria are met.'
)

p = doc.add_paragraph()
r = p.add_run('Estimated effort: ')
r.bold = True
p.add_run('8 hours')

p = doc.add_paragraph()
r = p.add_run('Dependencies: ')
r.bold = True
p.add_run('All previous sprints (1-6)')

add_heading('Deliverables', level=2)

add_table(
    ['Deliverable', 'Description'],
    [
        ['Architect walkthrough', 'Full session as architect role: init, skill usage, PR review, boundary audit, sprint planning'],
        ['Developer walkthrough', 'Full session as developer role: init, feature work, pre-PR, hook compliance'],
        ['QA walkthrough', 'Full session as QA role: init, test generation, security check, coverage review'],
        ['README.md', 'Onboarding guide: setup, role assignment, first session, skill reference, FAQ'],
        ['Acceptance criteria matrix', 'All 19 spec criteria mapped to evidence of completion'],
        ['Bug fixes', 'Any issues discovered during walkthroughs'],
    ]
)

add_heading('Key Implementation Details', level=2)

p = doc.add_paragraph()
r = p.add_run('Role Walkthroughs: ')
r.bold = True
p.add_run(
    'Each walkthrough simulates a real working session: clone repo, launch Claude Code, verify '
    'role context loads, use skills, trigger hooks, verify telemetry, check status line. '
    'Any friction points or failures are logged and fixed.'
)

p = doc.add_paragraph()
r = p.add_run('30-Minute Comprehension Test: ')
r.bold = True
p.add_run(
    'A new user should understand the full TAI setup in under 30 minutes by reading the README. '
    'The README is tested by timing how long it takes to explain TAI to someone unfamiliar with it.'
)

add_heading('Acceptance Criteria', level=2)

doc.add_paragraph(
    'All 19 spec acceptance criteria must pass. The following is the complete checklist '
    'from Spec Section 13:'
)

spec_criteria = [
    'Clone repo, launch Claude Code, full context loaded in 30 seconds',
    'Role ID works via git email + TAI_ROLE override',
    'Architect and developer sessions load different context and skills',
    'Boundary violation commit is blocked with clear error message',
    'Push with failing tests is blocked',
    'Hook bypass requires mandatory reason, logged to telemetry',
    'Hook crash blocks the action (conservative crash policy)',
    '/new-endpoint produces complete, pattern-compliant API route',
    '/pre-pr runs full verification + generates PR description with AI disclosure',
    'Every hook execution writes structured JSONL event',
    'Telemetry committed to repo, GitHub Action aggregates on push',
    'All 6 slash commands return correct data',
    'CLI status line displays: role, sprint, ISC, hooks, duration, version',
    'sprint-current.md visible in every session',
    '.tai/VERSION contains valid semver, displayed in status line',
    '.tai/ directory under 40 files, CORE.md under 200 lines',
    'New team member understands TAI in under 30 minutes via README',
    'All existing project tests pass with TAI hooks active',
    'No project-specific references in TAI core framework files',
]
for i, c in enumerate(spec_criteria, 1):
    add_check(f'AC-{i}: {c}')

p = doc.add_paragraph()
r = p.add_run('Spec Acceptance Criteria covered: ')
r.bold = True
p.add_run('All 19 (#1 through #19)')

# ============================================================
# TIMELINE
# ============================================================
doc.add_page_break()
add_heading('Timeline Options')

doc.add_paragraph(
    'The 7 sprints can be executed at different cadences depending on team availability:'
)

add_table(
    ['Cadence', 'Sprint Duration', 'Total Duration', 'Notes'],
    [
        ['Aggressive', '1 week', '7 weeks', 'Solo architect with AI-assisted development. Tight but achievable.'],
        ['Standard', '2 weeks', '14 weeks (3.5 months)', 'Comfortable pace with buffer for iteration.'],
        ['Conservative', '2 weeks + gaps', '18-20 weeks', 'With breaks between sprints for stabilization.'],
    ]
)

add_heading('Parallelism Opportunities', level=2)

doc.add_paragraph(
    'Sprints 2 (Enforcement) and 3 (Skills) have no dependencies on each other \u2014 both depend '
    'only on Sprint 1. If two people are available, these sprints can run in parallel, reducing '
    'the timeline by one sprint duration.'
)

doc.add_paragraph(
    'Similarly, Sprint 6 (Notifications + Migration) could overlap with Sprint 5 (Observability) '
    'if both depend only on Sprint 4 and are assigned to different people.'
)

add_heading('Risk-Adjusted Timeline', level=2)

add_table(
    ['Sprint', 'Risk Level', 'Risk Factor', 'Mitigation'],
    [
        ['1', 'Low', 'Well-defined directory structure', 'Template-driven, minimal unknowns'],
        ['2', 'Medium', 'Hook bypass interception complexity', 'Test with real git workflows early'],
        ['3', 'Low', 'Skills are markdown files, no runtime complexity', 'Use existing patterns as reference'],
        ['4', 'Medium', 'GitHub Action dedup logic, JSONL schema evolution', 'Start with simple aggregation, iterate'],
        ['5', 'High', 'CLI status line may face Claude Code limitations', 'Prototype status line first; fallback to session header'],
        ['6', 'Low', 'Webhook integration is well-understood', 'Test with one platform first, then abstract'],
        ['7', 'Medium', 'Integration bugs, friction points', 'Budget extra time for fixes discovered in walkthroughs'],
    ]
)

# ============================================================
# EFFORT SUMMARY
# ============================================================
add_heading('Effort Summary')

add_table(
    ['Sprint', 'Name', 'Hours', 'Files Created', 'Cumulative'],
    [
        ['1', 'Foundation + Session Protocol', '10', '~18', '10h'],
        ['2', 'Enforcement Layer', '10', '~7', '20h'],
        ['3', 'Skill Library', '8', '11', '28h'],
        ['4', 'Telemetry Pipeline', '8', '~6', '36h'],
        ['5', 'Observability', '8', '~8', '44h'],
        ['6', 'Notifications + Migration', '6', '~6', '50h'],
        ['7', 'Integration + Launch', '8', '~3', '58h'],
    ]
)

doc.add_paragraph('Total: 58 hours of AI-assisted development across 7 sprints.')

# ============================================================
# ACCEPTANCE CRITERIA TRACEABILITY
# ============================================================
doc.add_page_break()
add_heading('Acceptance Criteria Traceability Matrix')

doc.add_paragraph(
    'Maps each of the 19 spec acceptance criteria (Section 13) to the sprint that delivers it:'
)

add_table(
    ['AC #', 'Criterion', 'Sprint'],
    [
        ['1', 'Clone + launch = full context in 30 seconds', 'Sprint 1'],
        ['2', 'Role ID via git email + TAI_ROLE override', 'Sprint 1'],
        ['3', 'Architect vs developer = different context and skills', 'Sprint 1'],
        ['4', 'Boundary violation commit blocked with error', 'Sprint 2'],
        ['5', 'Push with failing tests blocked', 'Sprint 2'],
        ['6', 'Hook bypass requires reason, logged to telemetry', 'Sprint 2'],
        ['7', 'Hook crash blocks action', 'Sprint 2'],
        ['8', '/new-endpoint produces complete API route', 'Sprint 3'],
        ['9', '/pre-pr runs verification + PR desc with AI disclosure', 'Sprints 3 + 6'],
        ['10', 'Every hook execution writes JSONL event', 'Sprint 4'],
        ['11', 'Telemetry committed, GitHub Action aggregates', 'Sprint 4'],
        ['12', 'All 6 slash commands return correct data', 'Sprint 5'],
        ['13', 'CLI status line displays role/sprint/ISC/hooks/duration/version', 'Sprint 5'],
        ['14', 'sprint-current.md visible in every session', 'Sprint 1'],
        ['15', '.tai/VERSION contains semver, shown in status line', 'Sprints 1 + 5'],
        ['16', '.tai/ under 40 files, CORE.md under 200 lines', 'Sprint 7 (verified)'],
        ['17', 'New member understands TAI in 30 minutes via README', 'Sprint 7'],
        ['18', 'Existing tests pass with TAI hooks active', 'Sprint 7 (verified)'],
        ['19', 'No project-specific references in core framework', 'Sprint 7 (verified)'],
    ]
)

# ============================================================
# FOOTER
# ============================================================
doc.add_paragraph()
doc.add_paragraph()
footer = doc.add_paragraph()
footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = footer.add_run('END OF EXECUTION PLAN')
r.bold = True
r.font.size = Pt(10)

doc.add_paragraph()
closing = doc.add_paragraph()
closing.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = closing.add_run('TAI Execution Plan \u2014 Jinks Labs \u2014 March 2026')
r.font.size = Pt(9)
r.font.color.rgb = RGBColor(0x66, 0x66, 0x66)

# Save
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'TAI_Execution_Plan_v1.0.docx')
doc.save(output_path)
print(f'Saved: {output_path}')
