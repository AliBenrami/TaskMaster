import { describe, expect, it } from "vitest";
import { buildNormalizedCandidateFromMarkdown, summarizeDoclingArtifact } from "./heuristics";

describe("buildNormalizedCandidateFromMarkdown", () => {
  it("extracts a normalized academic payload from Docling markdown", () => {
    const markdown = `
# CS 4348-001 Database Systems
Term: Fall 2026
Instructor: Prof. Jane Smith
jane.smith@example.edu

## Course Description
This course covers relational database design, SQL, indexing, and transactions.

## Required Materials
- Database System Concepts
- Course notes on Canvas

## Grading
Homework 25%
Midterm 25%
Final Exam 30%
Project 20%

## Schedule
Week 1: Relational model
Sep 12 Homework 1 due
Oct 10 Midterm Exam 7:00 pm
Nov 20 Project presentation
`;

    const result = buildNormalizedCandidateFromMarkdown(markdown, "syllabus");

    expect(result.courseTitle).toContain("Database Systems");
    expect(result.courseCode).toBe("CS 4348");
    expect(result.term).toBe("Fall 2026");
    expect(result.contacts[0]?.email).toBe("jane.smith@example.edu");
    expect(result.requiredMaterials).toContain("Database System Concepts");
    expect(result.homeworkTools).toContain("Canvas");
    expect(result.gradingBreakdown).toHaveLength(4);
    expect(result.assignments.length).toBeGreaterThan(0);
    expect(result.events.length).toBeGreaterThan(0);
    expect(result.keyConcepts).toContain("Relational model");
  });

  it("extracts note-centric concepts in notes mode", () => {
    const markdown = `
# Operating Systems Notes

## Threads
Definition: A thread is the smallest unit of CPU execution.
Formula: turnaround = completion - arrival

## Scheduling
Algorithm: Round robin
`;

    const result = buildNormalizedCandidateFromMarkdown(markdown, "notes");

    expect(result.courseTitle).toContain("Operating Systems Notes");
    expect(result.keyConcepts).toContain("Threads");
    expect(result.keyConcepts).toContain("A thread is the smallest unit of CPU execution.");
    expect(result.warnings).not.toContain("Docling did not identify any instructor or TA contact lines.");
  });
});

describe("summarizeDoclingArtifact", () => {
  it("derives lightweight artifact counts from raw JSON", () => {
    const artifact = {
      pages: [{ id: 1 }, { id: 2 }],
      tables: [{}, {}],
      picture_items: [{}],
      headings: [{}, {}, {}],
    };

    const stats = summarizeDoclingArtifact(artifact);

    expect(stats.pageCount).toBe(2);
    expect(stats.tableCount).toBeGreaterThan(0);
    expect(stats.pictureCount).toBeGreaterThan(0);
    expect(stats.headingCount).toBeGreaterThan(0);
  });
});
