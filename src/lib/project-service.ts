import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { nanoid } from 'nanoid';
import type {
  AnimationProject,
  ProductionTask,
  CrewMember,
  CrewApplication,
  ProjectMessage,
  ShotStatus,
  TaskPriority,
  TaskComment,
} from './types';
import { SHOT_STATUS_ORDER } from './types';

const PROJECTS = 'production_projects';
const APPLICATIONS = 'crew_applications';

function slugify(title: string): string {
  const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return `${base}-${nanoid(6)}`;
}

// --- Projects -------------------------------------------------------------

export interface NewProjectInput {
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  title: string;
  logline: string;
  description?: string;
  genre: string[];
  format: AnimationProject['format'];
  fps: number;
  isPublic: boolean;
  isRecruiting: boolean;
  openRoles: Array<{ title: string; description?: string }>;
  onboardingSteps: string[];
  departments: Array<{ name: string; color: string }>;
  coverImageUrl?: string;
}

export async function createProject(input: NewProjectInput): Promise<string> {
  const departments = input.departments.map((d) => ({ id: nanoid(8), name: d.name, color: d.color }));
  const productionDept = departments.find((d) => /production/i.test(d.name)) ?? departments[0];

  const ref = await addDoc(collection(db, PROJECTS), {
    ownerId: input.ownerId,
    ownerName: input.ownerName,
    ownerAvatar: input.ownerAvatar ?? null,
    title: input.title,
    slug: slugify(input.title),
    logline: input.logline,
    description: input.description ?? '',
    genre: input.genre,
    format: input.format,
    phase: 'development',
    coverImageUrl: input.coverImageUrl ?? null,
    bannerUrl: null,
    fps: input.fps,
    isPublic: input.isPublic,
    isRecruiting: input.isRecruiting,
    openRoles: input.openRoles.map((r) => ({ id: nanoid(8), title: r.title, description: r.description ?? '', filled: false })),
    teamMemberIds: [input.ownerId],
    onboardingSteps: input.onboardingSteps.map((text) => ({ id: nanoid(8), text })),
    departments,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // The owner is automatically a crew member (Director/Owner by default).
  const batch = writeBatch(db);
  batch.set(doc(db, PROJECTS, ref.id, 'crew', input.ownerId), {
    userId: input.ownerId,
    name: input.ownerName,
    avatar: input.ownerAvatar ?? null,
    role: 'Director',
    departmentId: productionDept?.id ?? null,
    joinedAt: serverTimestamp(),
    completedSteps: [],
    status: 'active',
  });
  await batch.commit();

  return ref.id;
}

// Backfills fields added after some projects may already have been created
// (currently just `departments`) so older docs don't crash UI that assumes
// they exist.
function normalizeProject(raw: any): AnimationProject {
  return { departments: [], ...raw } as AnimationProject;
}

export async function getProjectById(id: string): Promise<AnimationProject | null> {
  const snap = await getDoc(doc(db, PROJECTS, id));
  return snap.exists() ? normalizeProject({ id: snap.id, ...snap.data() }) : null;
}

export async function updateProject(id: string, data: Partial<AnimationProject>): Promise<void> {
  await updateDoc(doc(db, PROJECTS, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, PROJECTS, id));
}

export async function getUserOwnedProjects(uid: string): Promise<AnimationProject[]> {
  const snap = await getDocs(query(collection(db, PROJECTS), where('ownerId', '==', uid)));
  return snap.docs.map((d) => normalizeProject({ id: d.id, ...d.data() }));
}

export async function getUserCrewProjects(uid: string): Promise<AnimationProject[]> {
  const snap = await getDocs(query(collection(db, PROJECTS), where('teamMemberIds', 'array-contains', uid)));
  return snap.docs
    .map((d) => normalizeProject({ id: d.id, ...d.data() }))
    .filter((p) => p.ownerId !== uid); // owned already covered by getUserOwnedProjects
}

export interface ProjectTaskStats {
  total: number;
  approved: number;
  inReview: number; // reviewStatus === 'submitted', across any stage
}

/** Cheap aggregation counts (no document bodies transferred) for dashboard
 * cards — avoids fetching every task just to show a progress bar. */
export async function getProjectTaskStats(projectId: string): Promise<ProjectTaskStats> {
  const tasksRef = collection(db, PROJECTS, projectId, 'tasks');
  const [totalSnap, approvedSnap, reviewSnap] = await Promise.all([
    getCountFromServer(query(tasksRef)),
    getCountFromServer(query(tasksRef, where('status', '==', 'approved'))),
    getCountFromServer(query(tasksRef, where('reviewStatus', '==', 'submitted'))),
  ]);
  return { total: totalSnap.data().count, approved: approvedSnap.data().count, inReview: reviewSnap.data().count };
}

export async function getPublicRecruitingProjects(): Promise<AnimationProject[]> {
  const snap = await getDocs(
    query(collection(db, PROJECTS), where('isPublic', '==', true), where('isRecruiting', '==', true))
  );
  return snap.docs.map((d) => normalizeProject({ id: d.id, ...d.data() }));
}

// --- Tasks ------------------------------------------------------------

export function subscribeToTasks(projectId: string, cb: (tasks: ProductionTask[]) => void): Unsubscribe {
  return onSnapshot(collection(db, PROJECTS, projectId, 'tasks'), (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductionTask)));
  });
}

export async function createTask(projectId: string, data: { title: string; description?: string; status: ShotStatus; priority?: TaskPriority; departmentId?: string; assigneeId?: string; assigneeName?: string; assigneeAvatar?: string; dueDate?: string }): Promise<string> {
  const ref = await addDoc(collection(db, PROJECTS, projectId, 'tasks'), {
    projectId,
    title: data.title,
    description: data.description ?? '',
    status: data.status,
    priority: data.priority ?? 'medium',
    reviewStatus: 'in_progress',
    departmentId: data.departmentId ?? null,
    assigneeId: data.assigneeId ?? null,
    assigneeName: data.assigneeName ?? null,
    assigneeAvatar: data.assigneeAvatar ?? null,
    dueDate: data.dueDate ?? null,
    submissionNote: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateTask(projectId: string, taskId: string, data: Partial<ProductionTask>): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'tasks', taskId), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, PROJECTS, projectId, 'tasks', taskId));
}

/** Assignee marks their work on the task's current stage ready for review. */
export async function submitTaskForReview(projectId: string, taskId: string, note?: string): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'tasks', taskId), {
    reviewStatus: 'submitted',
    submissionNote: note ?? null,
    updatedAt: serverTimestamp(),
  });
}

/** Owner/reviewer approves — advances the task to the next pipeline stage
 * and resets review state so the next stage starts fresh. */
export async function approveTask(projectId: string, taskId: string, currentStatus: ShotStatus): Promise<void> {
  const idx = SHOT_STATUS_ORDER.indexOf(currentStatus);
  const isLastStage = idx === -1 || idx === SHOT_STATUS_ORDER.length - 1;
  const nextStatus = isLastStage ? currentStatus : SHOT_STATUS_ORDER[idx + 1];
  await updateDoc(doc(db, PROJECTS, projectId, 'tasks', taskId), {
    status: nextStatus,
    reviewStatus: isLastStage ? 'approved' : 'in_progress',
    submissionNote: null,
    updatedAt: serverTimestamp(),
  });
}

/** Owner/reviewer sends the task back with feedback (posted as a comment). */
export async function requestTaskChanges(projectId: string, taskId: string, reviewer: { uid: string; name: string; avatar?: string }, feedback: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, PROJECTS, projectId, 'tasks', taskId), {
    reviewStatus: 'changes_requested',
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(collection(db, PROJECTS, projectId, 'tasks', taskId, 'comments')), {
    authorId: reviewer.uid,
    authorName: reviewer.name,
    authorAvatar: reviewer.avatar ?? null,
    text: feedback,
    createdAt: serverTimestamp(),
  });
  await batch.commit();
}

export function subscribeToTaskComments(projectId: string, taskId: string, cb: (comments: TaskComment[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, PROJECTS, projectId, 'tasks', taskId, 'comments'), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TaskComment)))
  );
}

export async function addTaskComment(projectId: string, taskId: string, author: { uid: string; name: string; avatar?: string }, text: string): Promise<void> {
  await addDoc(collection(db, PROJECTS, projectId, 'tasks', taskId, 'comments'), {
    authorId: author.uid,
    authorName: author.name,
    authorAvatar: author.avatar ?? null,
    text,
    createdAt: serverTimestamp(),
  });
}

// --- Crew ---------------------------------------------------------------

export function subscribeToCrew(projectId: string, cb: (crew: CrewMember[]) => void): Unsubscribe {
  return onSnapshot(collection(db, PROJECTS, projectId, 'crew'), (snap) => {
    cb(snap.docs.map((d) => d.data() as CrewMember).filter((m) => m.status === 'active'));
  });
}

export async function updateOnboardingProgress(projectId: string, userId: string, completedSteps: string[]): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'crew', userId), { completedSteps });
}

export async function updateCrewMemberRole(projectId: string, userId: string, role: string): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'crew', userId), { role });
}

export async function updateCrewMemberDepartment(projectId: string, userId: string, departmentId: string | null): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'crew', userId), { departmentId });
}

export async function removeCrewMember(projectId: string, userId: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, PROJECTS, projectId, 'crew', userId), { status: 'removed' });
  const project = await getProjectById(projectId);
  if (project) {
    batch.update(doc(db, PROJECTS, projectId), {
      teamMemberIds: project.teamMemberIds.filter((id) => id !== userId),
    });
  }
  await batch.commit();
}

// --- Applications ---------------------------------------------------------

export interface NewApplicationInput {
  projectId: string;
  projectTitle: string;
  projectCoverImageUrl?: string;
  applicantId: string;
  applicantName: string;
  applicantAvatar?: string;
  roleId?: string;
  roleTitle?: string;
  message: string;
  portfolioUrl?: string;
}

export async function applyToProject(input: NewApplicationInput): Promise<string> {
  const ref = await addDoc(collection(db, APPLICATIONS), {
    ...input,
    projectCoverImageUrl: input.projectCoverImageUrl ?? null,
    roleId: input.roleId ?? null,
    roleTitle: input.roleTitle ?? null,
    portfolioUrl: input.portfolioUrl ?? null,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToProjectApplications(projectId: string, cb: (apps: CrewApplication[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, APPLICATIONS), where('projectId', '==', projectId), where('status', '==', 'pending')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CrewApplication)))
  );
}

export async function getMyApplications(uid: string): Promise<CrewApplication[]> {
  const snap = await getDocs(query(collection(db, APPLICATIONS), where('applicantId', '==', uid)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as CrewApplication));
}

export async function acceptApplication(application: CrewApplication): Promise<void> {
  const projectRef = doc(db, PROJECTS, application.projectId);
  const project = await getProjectById(application.projectId);
  if (!project) throw new Error('Project not found');

  const batch = writeBatch(db);
  batch.set(doc(db, PROJECTS, application.projectId, 'crew', application.applicantId), {
    userId: application.applicantId,
    name: application.applicantName,
    avatar: application.applicantAvatar ?? null,
    role: application.roleTitle || 'Crew',
    joinedAt: serverTimestamp(),
    completedSteps: [],
    status: 'active',
  });
  batch.update(projectRef, {
    teamMemberIds: Array.from(new Set([...project.teamMemberIds, application.applicantId])),
    openRoles: application.roleId
      ? project.openRoles.map((r) => (r.id === application.roleId ? { ...r, filled: true } : r))
      : project.openRoles,
  });
  batch.update(doc(db, APPLICATIONS, application.id), { status: 'accepted', respondedAt: serverTimestamp() });
  await batch.commit();
}

export async function declineApplication(applicationId: string): Promise<void> {
  await updateDoc(doc(db, APPLICATIONS, applicationId), { status: 'declined', respondedAt: serverTimestamp() });
}

// --- Chat -------------------------------------------------------------

export function subscribeToMessages(projectId: string, cb: (messages: ProjectMessage[]) => void): Unsubscribe {
  return onSnapshot(
    query(collection(db, PROJECTS, projectId, 'messages'), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProjectMessage)))
  );
}

export async function sendMessage(projectId: string, sender: { uid: string; name: string; avatar?: string }, text: string, parentMessageId?: string): Promise<void> {
  await addDoc(collection(db, PROJECTS, projectId, 'messages'), {
    senderId: sender.uid,
    senderName: sender.name,
    senderAvatar: sender.avatar ?? null,
    text,
    parentMessageId: parentMessageId ?? null,
    createdAt: serverTimestamp(),
  });
}

/** Adds/removes the caller's own reaction — read-modify-write is fine here,
 * reaction contention on a small crew chat is not a real concern. */
export async function toggleMessageReaction(projectId: string, messageId: string, emoji: string, userId: string): Promise<void> {
  const ref = doc(db, PROJECTS, projectId, 'messages', messageId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const reactions: Record<string, string[]> = { ...(snap.data().reactions ?? {}) };
  const current = reactions[emoji] ?? [];
  reactions[emoji] = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
  if (reactions[emoji].length === 0) delete reactions[emoji];
  await updateDoc(ref, { reactions });
}

export async function linkMessageToTask(projectId: string, messageId: string, taskId: string, taskTitle: string): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'messages', messageId), { linkedTaskId: taskId, linkedTaskTitle: taskTitle });
}

export async function setMessageResolved(projectId: string, messageId: string, resolved: boolean, resolvedByName?: string): Promise<void> {
  await updateDoc(doc(db, PROJECTS, projectId, 'messages', messageId), { resolved, resolvedByName: resolved ? (resolvedByName ?? null) : null });
}
