import connectDB from "@/config/database";
//models
import Property from "@/models/Property";
// User from the session
import { getSessionUser } from "@/utils/getSessionUser";
// Cloudinary
import cloudinary from "@/config/cloudinary";


//GET /api/properties
export const GET = async (request) => {
    try {
        await connectDB();

        //Pagination
        const page = request.nextUrl.searchParams.get('page') || 1;
        const pageSize = request.nextUrl.searchParams.get('pageSize') || 3;

        const skip = (page - 1) * pageSize;

        const total = await Property.countDocuments({});

        const properties = await Property.find({}).skip(skip).limit(pageSize);

        const result = {
            total,
            properties
        }

        return new Response(JSON.stringify(result), { status: 200});
    } catch (error) {
        console.log(error);
        return new Response('Something Went Wrong', { status: 500})
    }
}

export const POST = async (request) => {
    try {
        await connectDB();

        // Session of the user
        const sessionUser = await getSessionUser()

        if (!sessionUser || !sessionUser.userId) {
            return new Response('User ID is required', { status: 401}) 
        }

        const { userId } = sessionUser;

        //  Data from the form in the UI
        const formData = await request.formData();

        // Access all values from amenities and images
        const amenities = formData.getAll('amenities');
        const images = formData.getAll('images').filter((image) => image.name !== '');

        // Create propertyData object for database
        const propertyData = {
            type: formData.get('type'),
            name: formData.get('name'),
            description: formData.get('description'),
            location: {
                street: formData.get('location.street'),
                city: formData.get('location.city'),
                state: formData.get('location.state'),
                zipcode: formData.get('location.zipcode')
            },
            beds: formData.get('beds'),
            baths: formData.get('baths'),
            square_feet: formData.get('square_feet'),
            amenities,
            rates: {
                weekly: formData.get('rates.weekly'),
                monthly: formData.get('rates.monthly'),
                nightly: formData.get('rates.nightly'),
            },
            seller_info: {
                name: formData.get('seller_info.name'),
                email: formData.get('seller_info.email'),
                phone: formData.get('seller_info.phone'),
            },
            owner: userId,
        }

        //upload images to cloudinary
        const imageUploadPromises = [];

        for (const image of images) {
            const imageBuffer = await image.arrayBuffer();
            const imageArray = Array.from(new Uint8Array(imageBuffer));
            const imageData = Buffer.from(imageArray);

            // Convert the image data to base64
            const imageBase64 = imageData.toString('base64');

            // Make request to upload to cloudinary
            const result = await cloudinary.uploader.upload(
                `data:image/png;base64,${imageBase64}`, {
                    folder: 'property-renta'
                }
            );

            imageUploadPromises.push(result.secure_url);


            // Wait for all images to upload
            const uploadedImages = await Promise.all(imageUploadPromises);
            // Add uploades images to the propertyData object
            propertyData.images = uploadedImages;
        }


        // Upload to the database
        const newProperty = new Property(propertyData);
        await newProperty.save();

        return Response.redirect(`${process.env.NEXTAUTH_URL}/properties/${newProperty._id}`);

        //return new Response(JSON.stringify({message: 'Success '}), { status: 200});
        
    } catch (error) {
        return new Response('Failed to add property', { status: 500})
        
    }
}