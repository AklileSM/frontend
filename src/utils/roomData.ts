// roomData.ts
//room specific data sorted by date for RoomExplorer, DONT FORGET THIS

export const dataByRoomAndDate: { 
    [room: string]: {
      [date: string]: {
        images: { src: string; type: 'image' }[];
        videos: { src: string; type: 'video' }[];
        pointclouds: { src: string; type: 'pointcloud' }[];
      }
    }
  } = {
    // room1: {
    //     '2024-10-07': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-09': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-11': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-14': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-16': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-18': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-21': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-23': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-25': { images: [], videos: [], pointclouds: [] },
    //     '2024-10-28': { images: [], videos: [], pointclouds: [] },
    //     '2024-11-01': { images: [], videos: [], pointclouds: [] }
    // },
    room2: {
        // '2024-10-07': { 
        //     images: [{ src: "/Images/thumbnails/20241007/room02.jpg", type: "image" },], 
        //     videos: [],
        //     pointclouds: [{ src: "/PCD/20241007/room02.glb", type: "pointcloud" },] },
        '2024-10-09': { 
            images: [{ src: "/Images/thumbnails/20241009/room02.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [{ src: "/PCD/20241009/room02.glb", type: "pointcloud" },] },
        '2024-10-11': { 
            images: [{ src: "/Images/thumbnails/20241011/room02.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-14': { 
            images: [{ src: "/Images/thumbnails/20241014/room02.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        // '2024-10-16': { 
        //     images: [{ src: "/Images/thumbnails/20241016/room02.jpg", type: "image" },], 
        //     videos: [], pointclouds: [] 
        // },
        // '2024-10-18': { images: [], videos: [], pointclouds: [] },
        // '2024-10-21': { images: [], videos: [], pointclouds: [] },
        // '2024-10-23': { images: [], videos: [], pointclouds: [] },
        // '2024-10-25': { images: [], videos: [], pointclouds: [] },
        // '2024-10-28': { images: [], videos: [], pointclouds: [] },
        // '2024-11-01': { images: [], videos: [], pointclouds: [] }
    },
    room3: {
        // '2024-10-07': { 
        //     images: [{ src: "/Images/thumbnails/20241007/room03.jpg", type: "image" },], 
        //     videos: [],
        //     pointclouds: [{ src: "/PCD/20241007/Room 3.glb", type: "pointcloud" },] },
        '2024-10-09': { 
            images: [{ src: "/Images/thumbnails/20241009/room03.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-11': { 
            images: [{ src: "/Images/thumbnails/20241011/room03.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-14': { 
            images: [{ src: "/Images/thumbnails/20241014/room03.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        // '2024-10-16': { 
        //     images: [{ src: "/Images/thumbnails/20241016/room03.jpg", type: "image" },],
        //     videos: [], pointclouds: [] },
        // '2024-10-18': { images: [], videos: [], pointclouds: [] },
        // '2024-10-21': { images: [], videos: [], pointclouds: [] },
        // '2024-10-23': { images: [], videos: [], pointclouds: [] },
        // '2024-10-25': { images: [], videos: [], pointclouds: [] },
        // '2024-10-28': { images: [], videos: [], pointclouds: [] },
        // '2024-11-01': { images: [], videos: [], pointclouds: [] }
    },
    room4: {
        // '2024-10-07': { images: [], videos: [], pointclouds: [] },
        '2024-10-09': { 
            images: [{ src: "/Images/thumbnails/20241009/room04.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-11': { 
            images: [{ src: "/Images/thumbnails/20241011/room04.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-14': { 
            images: [{ src: "/Images/thumbnails/20241014/room04.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        // '2024-10-16': { 
        //     images: [{ src: "/Images/thumbnails/20241016/room04.jpg", type: "image" },], 
        //     videos: [], pointclouds: [] },
        // '2024-10-18': { images: [], videos: [], pointclouds: [] },
        // '2024-10-21': { images: [], videos: [], pointclouds: [] },
        // '2024-10-23': { images: [], videos: [], pointclouds: [] },
        // '2024-10-25': { images: [], videos: [], pointclouds: [] },
        // '2024-10-28': { images: [], videos: [], pointclouds: [] },
        // '2024-11-01': { images: [], videos: [], pointclouds: [] }
    },
    room5: {
        // '2024-10-07': { images: [], videos: [], pointclouds: [] },
        '2024-10-09': { 
            images: [{ src: "/Images/thumbnails/20241009/room05.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        // '2024-10-11': { images: [], videos: [], pointclouds: [] },
        // '2024-10-14': { images: [], videos: [], pointclouds: [] },
        // '2024-10-16': { images: [], videos: [], pointclouds: [] },
        // '2024-10-18': { images: [], videos: [], pointclouds: [] },
        // '2024-10-21': { images: [], videos: [], pointclouds: [] },
        // '2024-10-23': { images: [], videos: [], pointclouds: [] },
        // '2024-10-25': { images: [], videos: [], pointclouds: [] },
        // '2024-10-28': { images: [], videos: [], pointclouds: [] },
        // '2024-11-01': { images: [], videos: [], pointclouds: [] }
    },
    room6: {
        // '2024-10-07': { images: [], videos: [], pointclouds: [] },
        '2024-10-09': { 
            images: [{ src: "/Images/thumbnails/20241009/room06.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        '2024-10-11': { 
            images: [{ src: "/Images/thumbnails/20241011/room06.jpg", type: "image" },], 
            videos: [], pointclouds: [] },
        '2024-10-14': { 
            images: [{ src: "/Images/thumbnails/20241014/room06.jpg", type: "image" },], 
            videos: [], 
            pointclouds: [] },
        // '2024-10-16': { 
        //     images: [{ src: "/Images/thumbnails/20241016/room06.jpg", type: "image" },],
        //     videos: [], pointclouds: [] },
        // '2024-10-18': { images: [], videos: [], pointclouds: [] },
        // '2024-10-21': { images: [], videos: [], pointclouds: [] },
        // '2024-10-23': { images: [], videos: [], pointclouds: [] },
        // '2024-10-25': { images: [], videos: [], pointclouds: [] },
        // '2024-10-28': { images: [], videos: [], pointclouds: [] },
        // '2024-11-01': { images: [], videos: [], pointclouds: [] }
    },
    
  };
  