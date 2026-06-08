import { useState, Children, isValidElement } from 'react'

export function Tabs({ children, defaultValue }) {
  const items = Children.toArray(children).filter(
    (child) => isValidElement(child) && child.props.value
  )
  const [active, setActive] = useState(defaultValue ?? items[0]?.props.value)

  const activeItem = items.find((item) => item.props.value === active)

  return (
    <div style={{ margin: '1rem 0' }}>
      <div
        style={{
          display: 'flex',
          borderBottom: '2px solid var(--vocs-color_border, #e5e7eb)',
          gap: '4px',
          marginBottom: '1rem',
        }}
      >
        {items.map((item) => {
          const isActive = item.props.value === active
          return (
            <button
              key={item.props.value}
              onClick={() => setActive(item.props.value)}
              style={{
                padding: '8px 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid #7E1BCC' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 400,
                color: isActive ? '#7E1BCC' : 'inherit',
                marginBottom: '-2px',
                fontSize: '14px',
              }}
            >
              {item.props.label ?? item.props.value}
            </button>
          )
        })}
      </div>
      <div>{activeItem}</div>
    </div>
  )
}

export function TabItem({ children }) {
  return <div>{children}</div>
}
