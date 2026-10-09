import { UserResponseDto } from '../../users/dto/user-response.dto.js';
import type { User } from '../../users/user.entity.js';

export class LoginResponseDto {
  accessToken: string;
  user: UserResponseDto;

  static from(accessToken: string, user: User): LoginResponseDto {
    const dto = new LoginResponseDto();
    dto.accessToken = accessToken;
    dto.user = UserResponseDto.fromEntity(user);
    return dto;
  }
}
