import { User } from '@/models/User';
import { IUser } from '@/types';
import { Types } from 'mongoose';

export class UserRepository {
  async create(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  async findById(id: string | Types.ObjectId): Promise<IUser | null> {
    return await User.findById(id).populate('assignedBranch', 'branchName branchCode');
  }

  async findByIdWithPassword(id: string | Types.ObjectId): Promise<IUser | null> {
    return await User.findById(id).select('+passwordHash');
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async findByEmailWithPassword(email: string): Promise<IUser | null> {
    return await User.findOne({ email })
      .select('+passwordHash')
      .populate('assignedBranch', 'branchName branchCode');
  }

  async updateById(id: string | Types.ObjectId, updateData: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
  }

  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  async softDeleteById(id: string | Types.ObjectId): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filter: any = {},
    sort: string = '-createdAt'
  ): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [users, total] = await Promise.all([
      User.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter)
    ]);

    return { users, total };
  }

  async findByRole(role: string): Promise<IUser[]> {
    return await User.find({ role, isActive: true }).select('-passwordHash');
  }

  async updatePassword(id: string | Types.ObjectId, newPassword: string): Promise<IUser | null> {
    const user = await User.findById(id).select('+passwordHash');
    if (!user) {
      return null;
    }

    (user as any).passwordHash = newPassword;
    return await user.save();
  }

  async updateEmailVerification(id: string | Types.ObjectId): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      id,
      { emailVerified: true },
      { new: true }
    );
  }

  async checkEmailExists(email: string): Promise<boolean> {
    const user = await User.findOne({ email });
    return !!user;
  }

  async searchUsers(query: string, page: number = 1, limit: number = 10, additionalFilter: any = {}): Promise<{ users: IUser[]; total: number }> {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(query, 'i');
    
    const filter = {
      isActive: true,
      ...additionalFilter,
      $or: [
        { displayName: searchRegex },
        { email: searchRegex },
      ],
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .sort('displayName')
        .skip(skip)
        .limit(limit)
        .select('-passwordHash'),
      User.countDocuments(filter)
    ]);

    return { users, total };
  }

  /**
   * Find nearby on-duty riders for auto-assignment
   * @param longitude - Branch longitude
   * @param latitude - Branch latitude
   * @param maxDistanceKm - Maximum distance in kilometers (default 10km)
   * @returns Array of nearby on-duty riders sorted by distance
   */
  async findNearbyOnDutyRiders(
    longitude: number,
    latitude: number,
    maxDistanceKm: number = 10
  ): Promise<IUser[]> {
    const maxDistanceMeters = maxDistanceKm * 1000;
    
    const riders = await User.find({
      role: 'RIDER',
      isActive: true,
      onDuty: true,
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: maxDistanceMeters,
        },
      },
    })
      .select('-passwordHash')
      .limit(5); // Get top 5 nearest riders
    
    return riders;
  }

  /**
   * Update rider's current location
   */
  async updateRiderLocation(
    riderId: string | Types.ObjectId,
    longitude: number,
    latitude: number
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      riderId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        lastLocationUpdate: new Date(),
      },
      { new: true, runValidators: true }
    );
  }

  /**
   * Update rider's on-duty status
   */
  async updateRiderDutyStatus(
    riderId: string | Types.ObjectId,
    onDuty: boolean
  ): Promise<IUser | null> {
    return await User.findByIdAndUpdate(
      riderId,
      { onDuty },
      { new: true, runValidators: true }
    );
  }
}
