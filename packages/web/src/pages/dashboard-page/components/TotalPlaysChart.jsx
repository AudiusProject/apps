import { useRef, useState, useEffect } from 'react'

import { Theme } from '@audius/common/models'
import { formatCount } from '@audius/common/utils'
import { Select } from '@audius/harmony'
import moment from 'moment'
import numeral from 'numeral'
import PropTypes from 'prop-types'
import { Line } from 'react-chartjs-2'

import { messages } from '../DashboardPage'

import styles from './TotalPlaysChart.module.css'

const MONTHS = {
  JAN: 'January',
  FEB: 'Febuary',
  MAR: 'March',
  APR: 'April',
  MAY: 'May',
  JUN: 'June',
  JUL: 'July',
  AUG: 'August',
  SEP: 'September',
  OCT: 'October',
  NOV: 'November',
  DEC: 'December'
}

const transformMonth = (monthShort) => MONTHS[monthShort]

const getDataProps = ({ labels, values }, theme) => {
  let colorPrimary, colorBackground
  switch (theme) {
    case Theme.DARK:
      colorPrimary = 'rgb(199, 75, 211)'
      colorBackground = 'rgba(199, 75, 211, 0.5)'
      break
    case Theme.MATRIX:
      colorPrimary = 'rgb(12, 241, 12)'
      colorBackground = 'rgba(12, 241, 12, 0.5'
      break
    default:
      colorPrimary = 'rgb(204, 15, 224)'
      colorBackground = 'rgba(204, 15, 224, 0.5)'
      break
  }
  return {
    labels: [...labels],
    datasets: [
      {
        fill: true,
        lineTension: 0.2,
        backgroundColor: colorBackground,
        borderColor: colorPrimary,
        borderCapStyle: 'butt',
        borderDash: [],
        borderDashOffset: 0.0,
        borderJoinStyle: 'miter',
        pointBorderColor: colorPrimary,
        pointBackgroundColor: colorPrimary,
        pointBorderWidth: 0,
        pointHoverRadius: 8,
        pointHoverBackgroundColor: colorPrimary,
        pointHoverBorderColor: colorPrimary,
        pointHoverBorderWidth: 0,
        pointRadius: 3,
        pointHitRadius: 8,
        data: [...values]
      }
    ]
  }
}

const getLineGraphOptions = (transformXValue) => ({
  layout: {
    padding: {
      top: 10,
      left: 20
    }
  },
  scales: {
    xAxes: [
      {
        gridLines: {
          display: false
        },
        ticks: {
          padding: 13,
          fontColor: 'rgba(133,129,153, 0.5)',
          fontSize: 10,
          fontStyle: 'bold'
        }
      }
    ],
    yAxes: [
      {
        gridLines: {
          display: false
        },
        ticks: {
          beginAtZero: true,
          width: 1000,
          fontColor: 'rgba(133,129,153, 0.5)',
          fontSize: 10,
          fontStyle: 'bold',
          callback: (value, index, values) => {
            if (value === 0) return ''
            // Do not show floats.
            if (parseInt(value) !== value) return ''
            return ` ${numeral(value).format('0a').toUpperCase()}`
          }
        },
        afterFit: function (scaleInstance) {
          scaleInstance.width = 22 // sets the width to 100px
        }
      }
    ]
  },
  legend: {
    display: false
  },
  tooltips: {
    enabled: false,
    titleFontSize: 10,
    titleFontStyle: 500,
    titleFontColor: '#FFFFFF',
    titleSpacing: 0,
    titleMarginBottom: 7,
    bodyFontSize: 16,
    bodyFontStyle: 'bold',
    bodyFontColor: '#FFFFFF',
    bodySpacing: 0,
    bodyMarginBottom: 2,
    xPadding: 16,
    yPadding: 11,
    xAlign: 'left',
    yAlign: 'bottom',
    position: 'nearest',
    custom: function (tooltipModel) {
      // Tooltip Element
      let tooltipEl = document.getElementById('chartjs-tooltip')

      // Create element on first render
      if (!tooltipEl) {
        tooltipEl = document.createElement('div')
        tooltipEl.id = 'chartjs-tooltip'
        tooltipEl.innerHTML = '<div></div>'
        document.body.appendChild(tooltipEl)
      }

      // Hide if no tooltip
      if (tooltipModel.opacity === 0) {
        tooltipEl.style.opacity = 0
        return
      }

      const title = tooltipModel.title[0] || []
      const playCount = tooltipModel.body[0].lines[0] || 0
      const innerHtml = `
        <div class='totalPlaysTooltipContainer'>
          <div class='totalPlaysTooltipTitle'>${title}</div>
          <div class='totalPlaysTooltipLabelContainer'>
            <div class='totalPlaysTooltipLabelText'>${
              playCount + ' Plays'
            }</div>
          </div>
          <div class='totalPlaysTooptipCarrot'/>
        </div>`

      tooltipEl.innerHTML = innerHtml

      // Display, position, and set styles for font
      tooltipEl.style.opacity = 1
      tooltipEl.style.position = 'absolute'
      tooltipEl.style.left =
        tooltipModel.caretX - tooltipEl.offsetWidth / 2 + 'px'
      tooltipEl.style.top =
        tooltipModel.caretY - tooltipEl.offsetHeight - 20 + 'px'
      tooltipEl.style.transition = 'opacity 0.18s ease-in-out'
      tooltipEl.style.pointerEvents = 'none'
    },
    callbacks: {
      label: (tooltipItem, data) => {
        const value = tooltipItem.yLabel
        return formatCount(value)
      },
      title: (tooltipItem, data) => {
        return transformXValue(tooltipItem[0].xLabel)
      }
    }
  }
})

const TotalPlaysChart = ({
  tracks = [],
  data = {
    labels: [
      'JAN',
      'FEB',
      'MAR',
      'APR',
      'MAY',
      'JUN',
      'JUL',
      'AUG',
      'SEP',
      'OCT',
      'NOV',
      'DEC'
    ],
    values: Array(12).fill(0)
  },
  onSetTrackOption,
  onSetYearOption,
  accountCreatedAt,
  theme
}) => {
  const [chartSize, setChartSize] = useState({ width: 0, height: 0 })
  const [yearOptions, setYearOptions] = useState([
    { value: messages.thisYear, label: messages.thisYear }
  ])
  const [selectedTrackId, setSelectedTrackId] = useState('-1')
  const [selectedYear, setSelectedYear] = useState(messages.thisYear)

  const chartContainer = useRef()
  const chart = useRef()

  const setChartWidthHeight = () => {
    if (chartContainer.current) {
      const { clientHeight: height, clientWidth: width } =
        chartContainer.current
      setChartSize({ width, height })
    }
  }

  useEffect(() => {
    setChartWidthHeight()
    window.addEventListener('resize', setChartWidthHeight)
    // NOTE: Hacky fix b/c chart.js uses canvas to calculte posistion,
    // so we need to have the font loaded to correctly measure text size to position the chart axes text
    document.fonts.ready.then(() => {
      if (chart.current?.chartInstance) {
        chart.current.chartInstance.update()
      }
    })

    // Calculate how many years to show in the dropdown
    const createdAt = moment(accountCreatedAt)
    const today = moment()

    const diff = today.diff(createdAt, 'years')
    const years = []
    for (let i = 0; i < diff; i++) {
      const year = createdAt.clone().add(i, 'years').year()
      years.push({ value: String(year), label: String(year) })
    }
    setYearOptions((prev) => [...prev, ...years])

    return () => {
      window.removeEventListener('resize', setChartWidthHeight)
    }
  }, [accountCreatedAt])

  const trackOptions = [{ name: 'All Tracks', id: -1 }].concat(tracks)

  const tracksOptions = trackOptions.map((t) => ({
    value: String(t.id),
    label: t.name
  }))

  const lineData = getDataProps(data, theme)
  const lineGraphOptions = getLineGraphOptions(transformMonth)

  return (
    <div className={styles.playsTileContainer}>
      <div className={styles.playsTileHeading}>
        <div className={styles.playsTileHeader}>Total Plays</div>
        <div className={styles.playsTrackDropdown}>
          <Select
            value={selectedTrackId}
            onChange={(value) => {
              setSelectedTrackId(value)
              onSetTrackOption?.(parseInt(value, 10))
            }}
            placeholder='All Tracks'
            options={tracksOptions}
            hideLabel
          />
        </div>
        <div className={styles.playsYearDropdown}>
          <Select
            value={selectedYear}
            onChange={(value) => {
              setSelectedYear(value)
              onSetYearOption?.(value)
            }}
            placeholder={messages.thisYear}
            options={yearOptions}
            hideLabel
          />
        </div>
      </div>
      <div className={styles.lineChartContainer} ref={chartContainer}>
        {chartSize.width && chartSize.height && (
          <Line
            ref={chart}
            data={lineData}
            options={lineGraphOptions}
            width={chartSize.width}
            height={chartSize.height}
          />
        )}
        <div id='chartjs-tooltip' style={{ opacity: 0 }} />
      </div>
    </div>
  )
}

TotalPlaysChart.propTypes = {
  tracks: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string
    })
  ),
  data: PropTypes.shape({
    values: PropTypes.arrayOf(PropTypes.number),
    labels: PropTypes.arrayOf(PropTypes.string)
  }),
  selectedTrack: PropTypes.number,
  selectedYear: PropTypes.string,
  onSetTrackOption: PropTypes.func,
  onSetYearOption: PropTypes.func,
  accountCreatedAt: PropTypes.string
}

export default TotalPlaysChart
