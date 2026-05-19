export const Permission = {
  ProjectRead: "project:read",
  ProjectWrite: "project:write",
  ProjectDelete: "project:delete",
  ProjectManageMembers: "project:manage_members",
  SprintWrite: "sprint:write",
  ItemWrite: "item:write",
  ItemDelete: "item:delete",
  CommentWrite: "comment:write",
  CommentDelete: "comment:delete",
  GoalWrite: "goal:write",
  MilestoneWrite: "milestone:write",
  WorkspaceManage: "workspace:manage",
  TeamWrite: "team:write",
  TeamDelete: "team:delete",
  TeamManageMembers: "team:manage_members",
} as const;

export type PermissionKey = typeof Permission[keyof typeof Permission];

// role -> set of permissions
export const PROJECT_ROLE_PERMS: Record<string, PermissionKey[]> = {
  owner: [
    Permission.ProjectRead,
    Permission.ProjectWrite,
    Permission.ProjectDelete,
    Permission.ProjectManageMembers,
    Permission.SprintWrite,
    Permission.ItemWrite,
    Permission.ItemDelete,
    Permission.CommentWrite,
    Permission.CommentDelete,
    Permission.GoalWrite,
    Permission.MilestoneWrite,
  ],
  admin: [
    Permission.ProjectRead,
    Permission.ProjectWrite,
    Permission.ProjectManageMembers,
    Permission.SprintWrite,
    Permission.ItemWrite,
    Permission.ItemDelete,
    Permission.CommentWrite,
    Permission.CommentDelete,
    Permission.GoalWrite,
    Permission.MilestoneWrite,
  ],
  member: [
    Permission.ProjectRead,
    Permission.SprintWrite,
    Permission.ItemWrite,
    Permission.CommentWrite,
    Permission.GoalWrite,
    Permission.MilestoneWrite,
  ],
};

export const TEAM_ROLE_PERMS: Record<string, PermissionKey[]> = {
  owner: [Permission.TeamWrite, Permission.TeamDelete, Permission.TeamManageMembers],
  admin: [Permission.TeamWrite, Permission.TeamManageMembers],
  member: [],
};

export function projectRoleHas(role: string | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return (PROJECT_ROLE_PERMS[role] ?? []).includes(permission);
}

export function teamRoleHas(role: string | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  return (TEAM_ROLE_PERMS[role] ?? []).includes(permission);
}
