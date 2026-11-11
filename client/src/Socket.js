import { io } from 'socket.io-client';

export const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
        return process.env.REACT_APP_BACKEND_URL;
    }

    return process.env.NODE_ENV === 'production'
        ? window.location.origin
        : 'http://localhost:5000';
};

export const initSocket = async () => {
    const options = {
        forceNew: true,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        transports: ['websocket', 'polling'],
    };

    return io(getBackendUrl(), options);
};
