import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User } from 'src/user/entities/user.entity';
import { UserService } from 'src/user/user.service';
import { serverError } from 'src/utils/server-error.util';
import { CreateRoomDto } from './dto/create-room.dto';
import { Room } from './entities/room.entity';

@Injectable()
export class RoomService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userService: UserService,
  ) {}

  async createRoomAndUserHost(createRoomDto: CreateRoomDto): Promise<Room> {
    const allNumbersDrawn: number[] = this.createAllNumbersDrawn();

    const data: Prisma.RoomCreateInput = {
      name: createRoomDto.name,
      drawnNumbers: allNumbersDrawn,
      status: true,
      ballTime: createRoomDto.ballTime,
      userCards: createRoomDto.userCards,
    };

    const room: Room = await this.prisma.room
      .create({
        data,
        select: {
          id: true,
          name: true,
          status: true,
          ballTime: true,
          userCards: true,
          users: true,
        },
      })
      .catch(serverError);

    const userHost: CreateUserDto = {
      nickname: createRoomDto.nickname,
      roomId: room.id,
    };

    const user: User = await this.userService.createUser(userHost);

    const roomAndUser = {
      id: room.id,
      name: room.name,
      status: room.status,
      ballTime: room.ballTime,
      userCards: room.userCards,
      users: [user],
    };

    return roomAndUser;
  }

  createAllNumbersDrawn(): number[] {
    const allNumbersDrawn: number[] = [];

    while (allNumbersDrawn.length < 75) {
      const drawnNumbers: number = Math.floor(Math.random() * (76 - 1)) + 1;
      if (!allNumbersDrawn.includes(drawnNumbers)) {
        allNumbersDrawn.push(drawnNumbers);
      }
    }

    return allNumbersDrawn;
  }

  async findAllRooms(): Promise<Room[]> {
    return await this.prisma.room.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        ballTime: true,
        userCards: true,
        users: {
          select: {
            id: true,
            nickname: true,
            score: true,
          },
        },
      },
    });
  }

  async findSingleRoom(roomId: string): Promise<Room> {
    await this.checkIfThereIsARoom(roomId);
    const roomWithUsersAndCards: Room = await this.prisma.room
      .findUnique({
        where: { id: roomId },
        select: {
          id: true,
          name: true,
          status: true,
          ballTime: true,
          userCards: true,
          users: {
            select: {
              id: true,
              nickname: true,
              score: true,
            },
          },
        },
      })
      .catch(serverError);

    return roomWithUsersAndCards;
  }

  async checkIfThereIsARoom(roomId: string): Promise<void> {
    const room = await this.prisma.room
      .findUnique({ where: { id: roomId } })
      .catch(serverError);

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }
  }
}
