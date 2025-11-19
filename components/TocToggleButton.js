import { CompassOutlined } from "@ant-design/icons"

export function TocToggleButton() {
    return (
        <div className="fixed right-4 bottom-9 md:right-10 text-4xl clickable">
            <CompassOutlined className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full shadow-lg p-2" />
        </div>
    )
}

// Keep backward compatibility alias
export const Float = TocToggleButton

