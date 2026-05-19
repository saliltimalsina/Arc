import { PrismaService } from "../prisma/prisma.service";

export interface ItemNotifContext {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  actorAvatarColor: string | null;
  projectId: string;
  projectKey: string;
  projectName: string;
  itemId: string;
  itemNumber: number;
  itemType: string;
  title: string;
  status: string;
  parentItemNumber?: number;
  parentTitle?: string;
}

export async function loadItemContext(
  prisma: PrismaService,
  actorId: string,
  itemId: string,
): Promise<ItemNotifContext> {
  const [actor, item] = await Promise.all([
    prisma.user.findUnique({
      where: { id: actorId },
      select: { id: true, name: true, avatarUrl: true, avatarColor: true },
    }),
    prisma.item.findUnique({
      where: { id: itemId },
      select: {
        id: true, number: true, type: true, title: true, status: true, projectId: true,
        parent: { select: { number: true, title: true } },
        project: { select: { id: true, key: true, name: true } },
      },
    }),
  ]);
  if (!actor || !item) throw new Error("Missing actor or item for notification context");
  return {
    actorId: actor.id,
    actorName: actor.name,
    actorAvatarUrl: actor.avatarUrl ?? null,
    actorAvatarColor: actor.avatarColor ?? null,
    projectId: item.project.id,
    projectKey: item.project.key,
    projectName: item.project.name,
    itemId: item.id,
    itemNumber: item.number,
    itemType: item.type,
    title: item.title,
    status: item.status,
    parentItemNumber: item.parent?.number,
    parentTitle: item.parent?.title,
  };
}

export interface ActorRef {
  actorId: string;
  actorName: string;
  actorAvatarUrl: string | null;
  actorAvatarColor: string | null;
}

export async function loadActor(prisma: PrismaService, userId: string): Promise<ActorRef> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, avatarUrl: true, avatarColor: true },
  });
  if (!u) throw new Error("Actor missing");
  return {
    actorId: u.id,
    actorName: u.name,
    actorAvatarUrl: u.avatarUrl,
    actorAvatarColor: u.avatarColor,
  };
}
