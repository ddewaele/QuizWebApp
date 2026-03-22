import type { PrismaClient } from "@prisma/client";
import type { CreateShareInput, UpdateShareInput } from "../schemas/sharing.schema.js";
import { NotFoundError, ForbiddenError, ValidationError } from "../utils/errors.js";
import type { EmailService } from "./email.service.js";

export class QuizSharingService {
  constructor(
    private prisma: PrismaClient,
    private emailService?: EmailService,
    private baseUrl?: string,
  ) {}

  private async findOwnedQuiz(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!quiz) throw new NotFoundError("Quiz");
    if (quiz.userId !== userId) throw new ForbiddenError();
    return quiz;
  }

  async share(quizId: string, userId: string, input: CreateShareInput) {
    const quiz = await this.findOwnedQuiz(quizId, userId);

    if (input.email === (await this.getOwnerEmail(userId))) {
      throw new ValidationError("Cannot share a quiz with yourself");
    }

    const existing = await this.prisma.quizShare.findUnique({
      where: { quizId_email: { quizId, email: input.email } },
    });

    if (existing && existing.status !== "REVOKED") {
      throw new ValidationError("Quiz is already shared with this email");
    }

    let share;

    if (existing && existing.status === "REVOKED") {
      share = await this.prisma.quizShare.update({
        where: { id: existing.id },
        data: {
          status: "PENDING",
          accessLevel: input.accessLevel,
          sharedAt: new Date(),
          acceptedAt: null,
        },
      });
    } else {
      share = await this.prisma.quizShare.create({
        data: {
          quizId,
          email: input.email,
          accessLevel: input.accessLevel,
          sharedBy: userId,
        },
      });
    }

    await this.sendShareInvitationEmail(share.token, quiz.title, userId, input.email);

    return share;
  }

  private async sendShareInvitationEmail(
    token: string,
    quizTitle: string,
    ownerUserId: string,
    recipientEmail: string,
  ): Promise<void> {
    if (!this.emailService || !this.baseUrl) return;

    const owner = await this.prisma.user.findUnique({
      where: { id: ownerUserId },
      select: { name: true, email: true },
    });

    await this.emailService.sendShareInvitation({
      recipientEmail,
      quizTitle,
      ownerName: owner?.name ?? owner?.email ?? "Someone",
      token,
      baseUrl: this.baseUrl,
    });
  }

  async listShares(quizId: string, userId: string) {
    await this.findOwnedQuiz(quizId, userId);

    return this.prisma.quizShare.findMany({
      where: { quizId },
      orderBy: { sharedAt: "desc" },
    });
  }

  async updateShare(shareId: string, quizId: string, userId: string, input: UpdateShareInput) {
    await this.findOwnedQuiz(quizId, userId);

    const share = await this.prisma.quizShare.findUnique({ where: { id: shareId } });
    if (!share || share.quizId !== quizId) throw new NotFoundError("Share");

    return this.prisma.quizShare.update({
      where: { id: shareId },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.accessLevel !== undefined && { accessLevel: input.accessLevel }),
      },
    });
  }

  async deleteShare(shareId: string, quizId: string, userId: string) {
    await this.findOwnedQuiz(quizId, userId);

    const share = await this.prisma.quizShare.findUnique({ where: { id: shareId } });
    if (!share || share.quizId !== quizId) throw new NotFoundError("Share");

    await this.prisma.quizShare.delete({ where: { id: shareId } });
  }

  async acceptByToken(token: string, userEmail: string) {
    const share = await this.prisma.quizShare.findUnique({ where: { token } });

    if (!share) throw new NotFoundError("Invitation");
    if (share.status === "REVOKED") throw new ForbiddenError("This invitation has been revoked");
    if (share.email.toLowerCase() !== userEmail.toLowerCase()) {
      throw new ForbiddenError("This invitation was sent to a different email address");
    }

    if (share.status === "ACCEPTED") {
      return share;
    }

    return this.prisma.quizShare.update({
      where: { id: share.id },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });
  }

  async listSharedWithUser(userEmail: string) {
    const shares = await this.prisma.quizShare.findMany({
      where: {
        email: { equals: userEmail, mode: "insensitive" },
        status: "ACCEPTED",
      },
      include: {
        quiz: {
          include: { _count: { select: { questions: true } } },
        },
      },
      orderBy: { sharedAt: "desc" },
    });

    return shares.map((s) => ({
      shareId: s.id,
      accessLevel: s.accessLevel,
      sharedAt: s.sharedAt,
      quiz: s.quiz,
    }));
  }

  async findAccessibleQuiz(quizId: string, userEmail: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: {
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { attempts: true } },
      },
    });

    if (!quiz) throw new NotFoundError("Quiz");

    const share = await this.prisma.quizShare.findFirst({
      where: {
        quizId,
        email: { equals: userEmail, mode: "insensitive" },
        status: "ACCEPTED",
      },
    });

    if (!share) throw new ForbiddenError();

    return { quiz, accessLevel: share.accessLevel };
  }

  private async getOwnerEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    return user?.email;
  }
}
