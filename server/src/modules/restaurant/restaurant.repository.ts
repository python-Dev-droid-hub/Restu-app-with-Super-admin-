import { Restaurant } from '@/models/Restaurant';
import { Types } from 'mongoose';

export class RestaurantRepository {
  async create(restaurantData: any): Promise<any> {
    const restaurant = new Restaurant(restaurantData);
    return await restaurant.save();
  }

  async findById(id: string | Types.ObjectId): Promise<any | null> {
    return await Restaurant.findById(id).populate('branchManager', 'displayName email phoneNumber');
  }

  async findByOwnerId(ownerId: string | Types.ObjectId): Promise<any[]> {
    return await Restaurant.find({ branchManager: ownerId, isActive: true });
  }

  async updateById(id: string | Types.ObjectId, updateData: any): Promise<any | null> {
    return await Restaurant.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('branchManager', 'displayName email phoneNumber');
  }

  async deleteById(id: string | Types.ObjectId): Promise<boolean> {
    const result = await Restaurant.findByIdAndDelete(id);
    return !!result;
  }

  async softDeleteById(id: string | Types.ObjectId): Promise<any | null> {
    return await Restaurant.findByIdAndUpdate(
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
  ): Promise<{ restaurants: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [restaurants, total] = await Promise.all([
      Restaurant.find({ ...filter, isActive: true })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('branchManager', 'displayName email phoneNumber'),
      Restaurant.countDocuments({ ...filter, isActive: true })
    ]);

    return { restaurants, total };
  }

  async findByCity(city: string, page: number = 1, limit: number = 10): Promise<{ restaurants: any[]; total: number }> {
    return await this.findAll(page, limit, { city: new RegExp(city, 'i') });
  }

  async findByCuisine(cuisine: string, page: number = 1, limit: number = 10): Promise<{ restaurants: any[]; total: number }> {
    return await this.findAll(page, limit, {}, '-createdAt');
  }

  async findByPriceRange(priceRange: string, page: number = 1, limit: number = 10): Promise<{ restaurants: any[]; total: number }> {
    return await this.findAll(page, limit, {}, '-createdAt');
  }

  async findNearby(
    coordinates: { lat: number; lng: number },
    maxDistance: number = 5000,
    page: number = 1,
    limit: number = 10
  ): Promise<{ restaurants: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const [restaurants, total] = await Promise.all([
      Restaurant.find({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates.lng, coordinates.lat],
            },
            $maxDistance: maxDistance,
          },
        },
      })
        .skip(skip)
        .limit(limit)
        .populate('branchManager', 'displayName email phoneNumber'),
      Restaurant.countDocuments({
        isActive: true,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [coordinates.lng, coordinates.lat],
            },
            $maxDistance: maxDistance,
          },
        },
      }),
    ]);

    return { restaurants, total };
  }

  async searchRestaurants(
    query: string,
    page: number = 1,
    limit: number = 10,
    filters: any = {}
  ): Promise<{ restaurants: any[]; total: number }> {
    const skip = (page - 1) * limit;
    
    const searchFilter = {
      ...filters,
      isActive: true,
      $text: { $search: query },
    };

    const [restaurants, total] = await Promise.all([
      Restaurant.find(searchFilter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .skip(skip)
        .limit(limit)
        .populate('branchManager', 'displayName email phoneNumber'),
      Restaurant.countDocuments(searchFilter),
    ]);

    return { restaurants, total };
  }

  async getTopRated(page: number = 1, limit: number = 10): Promise<{ restaurants: any[]; total: number }> {
    return await this.findAll(page, limit, {}, '-createdAt');
  }

  async updateRating(id: string | Types.ObjectId, newRating: number): Promise<any | null> {
    return await Restaurant.findById(id);
  }

  async getOpenRestaurants(currentTime: Date = new Date(), page: number = 1, limit: number = 10): Promise<{ restaurants: any[]; total: number }> {
    const skip = (page - 1) * limit;
    const day = currentTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const time = currentTime.toTimeString().slice(0, 5);
    
    const [restaurants, total] = await Promise.all([
      Restaurant.find({
        isActive: true,
        [`operatingHours.${day}.open`]: { $exists: true, $ne: null },
        [`operatingHours.${day}.close`]: { $exists: true, $ne: null },
      })
        .populate('branchManager', 'displayName email phoneNumber')
        .then((restaurants: any[]) => {
          return restaurants.filter((restaurant: any) => {
            const hours = restaurant.operatingHours[day as keyof typeof restaurant.operatingHours];
            return hours && hours.open && hours.close && time >= hours.open && time <= hours.close;
          });
        })
        .then((restaurants: any[]) => restaurants.slice(skip, skip + limit)),
      Restaurant.countDocuments({
        isActive: true,
        [`operatingHours.${day}.open`]: { $exists: true, $ne: null },
        [`operatingHours.${day}.close`]: { $exists: true, $ne: null },
      }),
    ]);

    return { restaurants, total };
  }
}
