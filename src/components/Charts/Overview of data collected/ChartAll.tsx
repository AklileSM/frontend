import { ApexOptions } from 'apexcharts';
import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

const options: ApexOptions = {
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
  responsive: [
    {
      breakpoint: 1536,
      options: {
        plotOptions: {
          bar: {
            borderRadius: 0,
            columnWidth: '25%',
          },
        },
      },
    },
  ],
  plotOptions: {
    bar: {
      horizontal: false,
      borderRadius: 0,
      columnWidth: '25%',
      borderRadiusApplication: 'end',
      borderRadiusWhenStacked: 'last',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: [
      '2024-10-07', '2024-10-09', '2024-10-11', '2024-10-14',
    ],
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

interface ChartAllState {
  series: {
    name: string;
    data: number[];
  }[];
}

const ChartAll: React.FC = () => {
  const [state, setState] = useState<ChartAllState>({
    series: [
      {
        name: '360 Images',
        data: [2, 5, 4, 4],
      },
      {
        name: 'Images',
        data: [0, 0, 0, 0],
      },
      {
        name: 'Video',
        data: [0, 0, 0, 0],
      },
      {
        name: 'Point Cloud',
        data: [2, 1, 1, 2],
      },
    ],
  });

  return (
    <div className="col-span-12 rounded-sm border border-stroke bg-white p-7.5 shadow-default dark:border-strokedark dark:bg-boxdark xl:col-span-4">
      <style>
        {`
          .apexcharts-tooltip {
            color: #000000 !important; /* Default text color for light mode */
            background: #ffffff !important; /* Default background for light mode */
          }
          .dark .apexcharts-tooltip {
            color: #ffffff !important; /* Text color for dark mode */
            background: #333333 !important; /* Background for dark mode */
          }
        `}
      </style>
      <div className="mb-4 justify-between gap-4 sm:flex">
        <div>
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Overview of Data Collected per Day
          </h4>
        </div>
      </div>
      <div>
        <div id="chartTwo" className="-ml-5 -mb-9">
          <ReactApexChart
            options={options}
            series={state.series}
            type="bar"
            height={350}
          />
        </div>
      </div>
    </div>
  );
};

export default ChartAll;
