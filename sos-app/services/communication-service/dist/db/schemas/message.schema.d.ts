/**
 * MongoDB Schema for Messages
 * Task 125: Mongoose schema with TTL index for 90-day auto-deletion
 */
import mongoose, { Document } from 'mongoose';
import { Message } from '../../models/Message';
export interface MessageDocument extends Omit<Message, 'id'>, Document {
    _id: mongoose.Types.ObjectId;
}
declare const MessageModel: mongoose.Model<MessageDocument, {}, {}, {}, mongoose.Document<unknown, {}, MessageDocument, {}, {}> & MessageDocument & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
}, any>;
export default MessageModel;
//# sourceMappingURL=message.schema.d.ts.map