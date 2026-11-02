/**
 * Role-Based Access Control (RBAC) & Article Lifecycle State Machine
 * readAday Core Architecture Requirements #1, #2, #3, #9:
 * "Roles: reader, writer, editor, admin. Secure role-based permissions."
 * "Draft, pending_review, published, rejected and archived states."
 * "Prevent unauthorized publishing and privilege escalation."
 */

import { UserRole, ArticleStatus, ContentType, Article } from '../types.ts';

export type PermissionAction =
  | 'article:create_editorial'
  | 'article:create_news'
  | 'article:create_community'
  | 'article:edit_own'
  | 'article:edit_any'
  | 'article:submit_review'
  | 'article:publish'
  | 'article:reject'
  | 'article:archive'
  | 'article:schedule'
  | 'collection:curate'
  | 'writer_application:review'
  | 'moderation:manage'
  | 'news:manage_sources'
  | 'admin:settings';

export const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  reader: [],
  writer: [
    'article:create_community',
    'article:edit_own',
    'article:submit_review',
  ],
  editor: [
    'article:create_editorial',
    'article:create_news',
    'article:create_community',
    'article:edit_own',
    'article:edit_any',
    'article:submit_review',
    'article:publish',
    'article:reject',
    'article:archive',
    'article:schedule',
    'collection:curate',
    'writer_application:review',
    'moderation:manage',
    'news:manage_sources',
  ],
  admin: [
    'article:create_editorial',
    'article:create_news',
    'article:create_community',
    'article:edit_own',
    'article:edit_any',
    'article:submit_review',
    'article:publish',
    'article:reject',
    'article:archive',
    'article:schedule',
    'collection:curate',
    'writer_application:review',
    'moderation:manage',
    'news:manage_sources',
    'admin:settings',
  ],
};

/**
 * Check if a user role has permission to execute an action.
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(action);
}

/**
 * Valid state transitions for article status lifecycle.
 */
export const ALLOWED_TRANSITIONS: Record<ArticleStatus, ArticleStatus[]> = {
  draft: ['pending_review', 'archived'],
  pending_review: ['published', 'rejected', 'scheduled', 'draft'],
  published: ['archived'],
  rejected: ['draft'],
  scheduled: ['published', 'draft', 'archived'],
  archived: ['draft'],
};

export interface StateTransitionResult {
  success: boolean;
  error?: string;
  newStatus?: ArticleStatus;
}

/**
 * Validates whether a state transition is legal according to lifecycle and user role.
 */
export function validateStateTransition(
  article: Article,
  targetStatus: ArticleStatus,
  userRole: UserRole,
  userId: string
): StateTransitionResult {
  // 1. Check if the transition is defined in the state machine
  const allowedNext = ALLOWED_TRANSITIONS[article.status] || [];
  if (!allowedNext.includes(targetStatus)) {
    return {
      success: false,
      error: `Illegal state transition from '${article.status}' to '${targetStatus}'. Allowed transitions: ${allowedNext.join(', ') || 'none'}.`,
    };
  }

  // 2. Role-specific privilege check
  if (targetStatus === 'published' || targetStatus === 'rejected' || targetStatus === 'scheduled') {
    // Only editor and admin can approve, reject, schedule, or publish
    if (userRole !== 'editor' && userRole !== 'admin') {
      return {
        success: false,
        error: `Privilege escalation blocked: Role '${userRole}' cannot transition an article to '${targetStatus}'. Requires 'editor' or 'admin'.`,
      };
    }
  }

  if (targetStatus === 'pending_review') {
    // Author or editor/admin can submit for review
    if (article.authorId !== userId && userRole !== 'editor' && userRole !== 'admin') {
      return {
        success: false,
        error: `Only the article author or an editor can submit this article for review.`,
      };
    }
  }

  return {
    success: true,
    newStatus: targetStatus,
  };
}

/**
 * Validates permission to create an article with specific content type.
 */
export function validateArticleCreation(
  contentType: ContentType,
  userRole: UserRole
): { permitted: boolean; error?: string } {
  if (contentType === 'editorial') {
    if (userRole !== 'editor' && userRole !== 'admin') {
      return {
        permitted: false,
        error: `Editorial articles can only be authored by editors or admins. Current role: '${userRole}'.`,
      };
    }
  } else if (contentType === 'news') {
    if (userRole !== 'editor' && userRole !== 'admin') {
      return {
        permitted: false,
        error: `News articles can only be ingested or published by editors, admins, or automated feed workers.`,
      };
    }
  } else if (contentType === 'community') {
    if (userRole === 'reader') {
      return {
        permitted: false,
        error: `Readers cannot publish community articles directly. Please apply to become a writer first.`,
      };
    }
  }

  return { permitted: true };
}
