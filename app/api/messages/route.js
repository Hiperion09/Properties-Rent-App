import connectDB from "@/config/database";
import Message from "@/models/Message";
import { getSessionUser } from "@/utils/getSessionUser";

export const dynamic = 'force-dynamic';

// GET /api/messages
export const GET = async (request) => {
    try {
        await connectDB();

        //Chequear si hay un usuario autenticado
        const sessionUser = await getSessionUser();

        if (!sessionUser || !sessionUser.user) {
            return new Response(JSON.stringify('User ID is required'), { status: 401 });
        }

        const { userId } = sessionUser;

        const readMessages = await Message.find({ recipient: userId, read: true })
        .sort({ createdAt: -1 }) //Sort read messages in asc order
        .populate('sender', 'username')
        .populate('property', 'name');

        const unreadMessages = await Message.find({ recipient: userId, read: false })
        .sort({ createdAt: -1 }) //Sort read messages in asc order
        .populate('sender', 'username')
        .populate('property', 'name');

        const messages = [...unreadMessages, ...readMessages];

        return new Response(JSON.stringify(messages), { status: 200 });
    } catch (error) {
        console.log(error);
        return new Response('Something went wrong', { status: 500 });
    }
}

// POST /api/messages
export const POST = async (request) => {
    try {
        await connectDB();

        // Obtener la informacion del formulario
        const {name, email, phone, message, property, recipient } = await request.json();

        //Chequear si hay un usuario autenticado
        const sessionUser = await getSessionUser();

        if (!sessionUser || !sessionUser.user) {
            return new Response(JSON.stringify({message: 'You must be logged in to send a message'}), { status: 401 });
        }

        const { user } = sessionUser;

        //Cannot send meessages to self
        if (user.id === recipient) {
            return new Response(JSON.stringify({message: 'Cannot send messages to yourself'}), { status: 400 });
        }

        const newMessage = new Message({
            sender: user.id,
            recipient,
            property,
            name,
            email,
            phone,
            body: message,
        });

        // Save message in the database
        await newMessage.save();

        return new Response(JSON.stringify({message: 'Message Sent'}), { status: 200 });

    } catch (error) {
        console.log(error);
        return new Response('Something went wrong', { status: 500 });
    }
}