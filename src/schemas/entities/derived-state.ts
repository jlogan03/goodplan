import { z } from "zod";
import type { ContentRef } from "../envelope.js";
import type { ConvergenceState } from "../trust/convergence.js";
import type { DimensionResult } from "../trust/reviewer-payload.js";

// --- Phase ---

/**
 * Phase enum covering all phases.
 * Epic phases: P0 (initialized) through P12 (landed).
 * Side-quest phases: S0 through S3.
 * Dual type pattern: z.enum() for runtime validation, z.infer for TS type.
 */
export const PhaseSchema = z.enum([
	// Epic phases
	"P0", // project initialized, epic created
	"P1", // epic goal committed
	"P2", // exploration concluded
	"P3", // architecture target committed
	"P4", // pressure test committed
	"P5", // slice set committed
	"P6", // epic activated
	"P7", // slice plan drafted
	"P8", // plan shape approved
	"P9", // slice plan committed
	"P10", // slice implementation started
	"P11", // slice code refinement started
	"P12", // slice landed
	// Side-quest phases
	"S0", // side-quest created
	"S1", // side-quest goal/plan committed
	"S2", // side-quest implementation started
	"S3", // side-quest landed
]);
export type Phase = z.infer<typeof PhaseSchema>;

// --- Steering Preference ---

export const SteeringPreferenceSchema = z.enum([
	"always-consult",
	"best-guess-and-flag",
	"ask-in-the-moment",
]);
export type SteeringPreference = z.infer<typeof SteeringPreferenceSchema>;

// --- Trust types (canonical definitions in src/schemas/trust/) ---

/**
 * Convergence snapshot for derived state.
 * Uses ConvergenceState from the trust layer's canonical schema.
 */
export interface ConvergenceSnapshot {
	scopeRef: string;
	artifactType: string;
	state: ConvergenceState;
	round: number;
}

/**
 * Dimension score for derived state.
 * Aligned with DimensionResult from the trust layer's canonical schema.
 */
export type DimensionScore = DimensionResult;

// --- Finding ---

export interface Finding {
	id: string;
	summary: string;
	disposition: "accepted" | "dismissed" | "pending";
}

// --- Chunk State ---

export interface ChunkState {
	id: string;
	description: string;
	verificationType: string | null;
	status:
		| "pending"
		| "red-written"
		| "red-failed"
		| "green"
		| "verified"
		| "unverifiable"
		| "decided";
}

// --- Slice State ---

export interface SliceState {
	dir: string;
	goal: ContentRef | null;
	plan: ContentRef | null;
	phase: Phase;
	chunks: Map<string, ChunkState>;
	abandoned: boolean;
}

// --- Epic State ---

export interface EpicState {
	dir: string;
	goal: ContentRef | null;
	architectureTarget: ContentRef | null;
	pressureTest: ContentRef | null;
	sliceSet: ContentRef | null;
	steeringPreference: SteeringPreference;
	phase: Phase;
	slices: Map<string, SliceState>;
	findings: Finding[];
	active: boolean;
	paused: boolean;
	completed: boolean;
	abandoned: boolean;
	// Intermediate sub-phase fields (populated by exploration/architecture reducers)
	explorationCycles: number;
	researchRefs: ContentRef[];
	brainstormRefs: ContentRef[];
	architectureShapeApproved: boolean;
	sliceSetShapeApproved: boolean;
}

// --- Side-Quest State ---

export interface SideQuestState {
	dir: string;
	goal: ContentRef | null;
	plan: ContentRef | null;
	phase: Phase;
	chunks: Map<string, ChunkState>;
	active: boolean;
	landed: boolean;
	abandoned: boolean;
}

// --- Project State ---

export interface ProjectState {
	name: string;
	version: string;
	steeringPreference: SteeringPreference;
	initialized: boolean;
}

// --- Next Step ---

export interface NextStep {
	command: string;
	description: string;
	priority: number;
}

// --- Blocker ---

export interface Blocker {
	scopeRef: string;
	description: string;
}

// --- Transition ---

export interface Transition {
	command: string;
	description: string;
}

// --- Subsystem State ---

export interface SubsystemState {
	name: string;
	maturity: "experimental" | "stable" | "mature" | "deprecated";
	owns: string[];
	retired: boolean;
}

// --- Custom Invariant State ---

export interface CustomInvariantState {
	id: string;
	description: string;
	status: "proposed" | "active" | "inactive";
}

// --- Briefing State ---

export interface Briefing {
	scope: "project" | "epic";
	scopeRef: string | null;
	timeContext: string;
	currentPosition: string;
	lastAction: string;
	whereStopped: string;
	nextAction: string;
	attentionItems: string[];
	deepLinks?: Array<{ label: string; path: string }>;
	writtenAt: string;
}

// --- Derived State Data ---

export interface DerivedStateData {
	project: ProjectState;
	epics: Map<string, EpicState>;
	sideQuests: Map<string, SideQuestState>;
	convergenceSnapshots: Map<string, ConvergenceSnapshot>;
	latestDimensionScores: Map<string, DimensionScore[]>;
	subsystems: Map<string, SubsystemState>;
	customInvariants: Map<string, CustomInvariantState>;
	briefings: Briefing[];
}
