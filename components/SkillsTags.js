export const skills = [
    { name: "Unix/Linux", color: "tag-orange" },
    { name: "film shoot", color: "tag-purple" },
    { name: "React", color: "tag-sky" },
    { name: "Nextjs", color: "tag-gray" },
    { name: "nvim", color: "tag-green" },
];

export function SkillsList({ className = "" }) {
    return (
        <div className={`flex flex-wrap justify-center gap-3 ${className}`}>
            {skills.map((skill) => (
                <div key={skill.name} className={`tag-rich ${skill.color} whitespace-nowrap`}>
                    {skill.name}
                </div>
            ))}
        </div>
    );
}

export default function SkillsTags() {
    return (
        <div className="bg-white dark:bg-gray-900 px-4 pt-2">
            <div className="flex justify-center">
                <div className="w-full">
                    {/* Mobile: Horizontal Scroll, Desktop: Wrap & Center */}
                    <SkillsList />
                </div>
            </div>
        </div>
    )
}
