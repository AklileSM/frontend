import { ApexOptions } from 'apexcharts';
import React, { useState, useEffect } from 'react';
import ReactApexChart from 'react-apexcharts';

interface ChartLocationProps {
  hoveredRoom: string | null;
}

const overviewOptions: ApexOptions = {
  colors: ['#3C50E0', '#80CAEE', '#FFB547', '#FF7F50'],
  chart: {
    fontFamily: 'Satoshi, sans-serif',
    type: 'bar',
    height: 335,
    stacked: true,
    toolbar: {
      show: false,
    },
    zoom: {
      enabled: false,
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '25%',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: ['Room 1', 'Room 2', 'Room 3', 'Room 4', 'Room 5', 'Room 6'],
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
    fontFamily: 'Satoshi',
    fontWeight: 500,
    fontSize: '14px',
    markers: {
      radius: 99,
    },
  },
  fill: {
    opacity: 1,
  },
};

const roomOptions: ApexOptions = {
  chart: {
    ...overviewOptions.chart,
    stacked: false,
    animations: {
      enabled: true,
      easing: 'linear',
      speed: 200,  // Reduced speed for quicker transitions
    },
  },
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '25%',
    },
  },
  colors: ['#3C50E0'],
  xaxis: {
    categories: ['360 Images', 'Images', 'Video', 'Point Cloud'],
  },
};


const chartData = {
  overview: [
    { name: '360 Images', data: [0, 5, 5, 4, 1, 4] },
    { name: 'Images', data: [0, 0, 0, 0, 0, 0] },
    { name: 'Video', data: [0, 0, 0, 0, 0, 0] },
    { name: 'Point Cloud', data: [0, 5, 3, 0, 0, 0] },
  ],
  room1: [{ name: 'Data', data: [0, 0, 0, 0] }],
  room2: [{ name: 'Data', data: [5, 0, 0, 5] }],
  room3: [{ name: 'Data', data: [5, 0, 0, 3] }],
  room4: [{ name: 'Data', data: [4, 0, 0, 0] }],
  room5: [{ name: 'Data', data: [1, 0, 0, 0] }],
  room6: [{ name: 'Data', data: [4, 0, 0, 0] }],
};

const ChartLocation: React.FC<ChartLocationProps> = ({ hoveredRoom }) => {
  const [currentData, setCurrentData] = useState(chartData.overview);
  const [currentOptions, setCurrentOptions] = useState(overviewOptions);

  useEffect(() => {
    if (hoveredRoom && hoveredRoom !== 'overview') {
      // Display the room-specific data as a single series
      const roomData = chartData[hoveredRoom as keyof typeof chartData];
      setCurrentData(roomData);
      setCurrentOptions(roomOptions);
    } else {
      // Revert to overview data
      setCurrentData(chartData.overview);
      setCurrentOptions(overviewOptions);
    }
  }, [hoveredRoom]);

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white p-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <div className="mb-4 justify-between gap-4 sm:flex">
        <div>
          <h4 className="text-xl font-semibold text-black dark:text-white">
            {hoveredRoom && hoveredRoom !== 'overview' ? `Data Collected in ${hoveredRoom.charAt(0).toUpperCase() + hoveredRoom.slice(1)}` : 'Overview of Data Collected Per Room'}
          </h4>
        </div>
      </div>
      <div>
        <div id="chartTwo" className="-ml-5 -mb-9">
          <ReactApexChart
            options={currentOptions}
            series={currentData}
            type="bar"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartLocation;
