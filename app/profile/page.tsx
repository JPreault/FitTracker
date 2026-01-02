import ProfileForm from "./form";

export default function ProfilePage() {
    return (
        <div className="w-full max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
            <h1 className="text-3xl font-bold tracking-tight mb-2">Vos informations :</h1>
            <ProfileForm />
        </div>
    );
}
