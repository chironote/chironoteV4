---
type: knowledge-system
title: "Healtech Simplified Open Knowledge System"
description: "Portable method for synthesizing repository information into a shallow, concept-oriented knowledge layer for humans and agents."
resource: "../index.md"
tags: [knowledge-management, oks, agents, documentation]
---

# Healtech Simplified Open Knowledge System

Healtech simplified OKS is a repository knowledge-organization method for making information immediately queryable by users and agents. It borrows the idea of structured, portable knowledge from Open Knowledge Format while using a smaller convention suited to codebases of any size.

The unit of organization is a concept, not a source document. `README.md`, `AGENTS.md`, context files, code, schemas, and policies are evidence that feed the system; their filenames and original hierarchy do not define its navigation.

## Objectives

- Answer domain questions without requiring readers to know where the source information originated.
- Consolidate overlapping generations of documentation into current concepts.
- Preserve traceability through provenance links.
- Keep navigation predictable across small projects and large monorepos.
- Remain simple enough to create or refresh during ordinary repository work.

## Structural Contract

```text
knowledge/
  index.md
  log.md
  <category>/
    <concept>.md
```

Only the reserved `index.md` and `log.md` files belong at the root. Concepts are exactly one category deep; subcategories are not allowed. Categories represent stable domains such as architecture, development, components, infrastructure, operations, or security.

Each concept has YAML fields for `type`, `title`, `description`, primary `resource`, and retrieval `tags`. Its body synthesizes the current understanding and ends with a `Provenance` section linking the evidence used.

## Method

1. Inventory knowledge-bearing documentation, configuration, schemas, and implementation.
2. Extract claims and group them by questions a reader would ask.
3. Resolve duplication and conflicts, favoring current specific evidence over older general summaries.
4. Write named concepts that communicate purpose, boundaries, behavior, and ownership.
5. Build `index.md` as a domain-oriented query router that explains what each concept answers.
6. Maintain `log.md` as a newest-first chronological record of meaningful knowledge changes.
7. Validate structure, metadata, provenance, index coverage, log format, and links.

Generic concepts named `agents`, `context`, `readme`, or `information` are a design failure: they expose the container instead of the knowledge. Their contents should be divided among concepts such as system architecture, development workflow, recording lifecycle, authentication boundary, release process, or security controls.

## Scaling Rule

A small project may need only a few concepts under architecture and development. A large repository may have many categories and concept files, but it keeps the same depth limit. Split concepts by distinct questions, ownership, or change cadence—not merely because the source material is long.

## Maintenance Rule

The OKS changes when the system's meaning changes. Code and documentation updates must revise any invalidated concept in the same change. Adding, removing, splitting, merging, renaming, deprecating, or correcting a concept also requires updating `knowledge/index.md` as needed and adding an entry to `knowledge/log.md`.

## Log Contract

`knowledge/log.md` has no frontmatter because `log.md` is a reserved OKF file. It contains a title followed by ISO `YYYY-MM-DD` headings in newest-first order. Under each date, concise bullets begin with a bold action label such as `**Creation**`, `**Update**`, `**Correction**`, `**Deprecation**`, `**Split**`, or `**Merge**`. Entries link to affected concepts when useful and describe changes to the knowledge system, not every source-code commit.

## Reusable Skill

The personal Codex skill `$healtech-oks` applies this method to other repositories. It inventories evidence, constructs the concept map, creates or refactors `/knowledge`, initializes its chronological log, updates repository guidance, and runs a structural validator.

## Provenance

Formalized from the knowledge-system refactor in this repository, the repository's [`AGENTS.md`](../../AGENTS.md), the [ChiroNote Knowledge Index](../index.md), the [ChiroNote Knowledge Update Log](../log.md), and the [Open Knowledge Format v0.1 specification](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md).
