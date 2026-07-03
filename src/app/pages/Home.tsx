import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

/**
 * A container component with a shadow effect, built for React Native.
 */
const CustomBox = ({ children, style }) => {
    return (
        <View style={style}>
            <View style={styles.shadowLayer} />
            <View style={styles.contentLayer}>
                {children}
            </View>
        </View>
    );
};

/**
 * The main Home screen component, built for a React Native mobile application.
 */
const Home = ({navigation}) => {
    // State to manage UI based on authentication status
    const [isLoggedIn, setIsLoggedIn] = React.useState(true);
    
    // Mock data for the user profile and expenses
    const userProfile = {
        name: 'Alex Doe',
        email: 'alex.doe@example.com',
        avatarInitial: 'A',
    };

    const userExpenses = [
        { id: 1, category: 'Food', amount: 75.50, icon: '🍔' },
        { id: 2, category: 'Transport', amount: 50.00, icon: '🚗' },
        { id: 3, category: 'Utilities', amount: 120.25, icon: '💡' },
        { id: 4, category: 'Fun', amount: 40.00, icon: '🎉' },
        { id: 5, category: 'Health', amount: 95.00, icon: '❤️' },
    ];

    /**
     * Logs the user out. In a real app, this would also handle token clearing.
     */
    const handleLogout = () => {
        // In a real React Native app, you would use AsyncStorage here.
        // For example: await AsyncStorage.removeItem('accessToken');
        setIsLoggedIn(false);
    };
    
    // --- Render logic for a logged-out user ---
    if (!isLoggedIn) {
        return (
            <View style={styles.loggedOutContainer}>
                 <CustomBox style={styles.loggedOutBox}>
                    <Text style={styles.loggedOutTitle}>You have been logged out.</Text>
                    <Text style={styles.loggedOutSubtitle}>Please return to the login page to sign in.</Text>
                </CustomBox>
            </View>
        );
    }

    // --- Calculations for the dashboard ---
    const totalExpenses = userExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const maxAmount = Math.max(...userExpenses.map(e => e.amount), 0);

    return (
        <ScrollView style={styles.screen}>
            <View style={styles.container}>
                <CustomBox>
                    {/* --- User Profile Section --- */}
                    <View style={styles.header}>
                        <View style={styles.userInfo}>
                             <View style={styles.avatar}>
                                <Text style={styles.avatarText}>{userProfile.avatarInitial}</Text>
                            </View>
                            <View>
                                <Text style={styles.userName}>{userProfile.name}</Text>
                                <Text style={styles.userEmail}>{userProfile.email}</Text>
                            </View>
                        </View>
                         <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
                            <Text style={styles.logoutButtonText}>Logout</Text>
                        </TouchableOpacity>
                    </View>

                    {/* --- Main Content --- */}
                    <View style={styles.mainContent}>
                        {/* --- Expense List Section --- */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Recent Expenses</Text>
                            <View>
                                {userExpenses.map(expense => (
                                    <View key={expense.id} style={styles.expenseItem}>
                                        <View style={styles.expenseItemInfo}>
                                            <Text style={styles.expenseIcon}>{expense.icon}</Text>
                                            <Text style={styles.expenseCategory}>{expense.category}</Text>
                                        </View>
                                        <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.totalContainer}>
                                <Text style={styles.totalText}>Total</Text>
                                <Text style={styles.totalAmount}>${totalExpenses.toFixed(2)}</Text>
                            </View>
                        </View>

                        {/* --- Expense Graph Section --- */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Expense Overview</Text>
                            <View style={styles.graphContainer}>
                                {userExpenses.map(expense => {
                                    const barHeight = maxAmount > 0 ? (expense.amount / maxAmount) * 100 : 0;
                                    return (
                                        <View key={expense.id} style={styles.barWrapper}>
                                            <View style={styles.barChart}>
                                                <Text style={styles.barLabel}>${expense.amount.toFixed(0)}</Text>
                                                <View style={[styles.bar, { height: `${barHeight}%` }]}/>
                                            </View>
                                            <Text style={styles.categoryLabel}>{expense.category}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </View>
                    </View>
                </CustomBox>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    // Custom Box Styles
    shadowLayer: {
        position: 'absolute',
        top: 5,
        left: 5,
        right: -5,
        bottom: -5,
        backgroundColor: '#9ca3af', // gray-400
        borderRadius: 20,
    },
    contentLayer: {
        backgroundColor: 'white',
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'black',
        padding: 24,
        paddingBottom: 40,
    },
    // Screen & Container
    screen: {
        flex: 1,
        backgroundColor: '#f1f5f9', // slate-100
    },
    container: {
        padding: 16,
    },
    section: {
        marginTop: 40,
    },
    mainContent: {
        // This view wraps the two sections
    },
    // Logged Out Styles
    loggedOutContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#f3f4f6', // gray-100
    },
    loggedOutBox: {
        width: '100%',
        maxWidth: 400,
    },
    loggedOutTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1f2937', // gray-800
        textAlign: 'center',
    },
    loggedOutSubtitle: {
        fontSize: 16,
        color: '#4b5563', // gray-600
        marginTop: 8,
        textAlign: 'center',
    },
    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0', // slate-200
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#6366f1', // indigo-500
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        elevation: 5,
    },
    avatarText: {
        color: 'white',
        fontSize: 30,
        fontWeight: 'bold',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1e293b', // slate-800
    },
    userEmail: {
        color: '#64748b', // slate-500
    },
    logoutButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        backgroundColor: '#e2e8f0', // slate-200
        borderRadius: 8,
    },
    logoutButtonText: {
        color: '#334155', // slate-700
        fontWeight: '600',
    },
    // Expenses List
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#334155', // slate-700
        marginBottom: 16,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f8fafc', // slate-50
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
    },
    expenseItemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expenseIcon: {
        fontSize: 24,
        marginRight: 16,
    },
    expenseCategory: {
        color: '#334155', // slate-700
        fontWeight: '500',
    },
    expenseAmount: {
        fontWeight: '600',
        color: '#1e293b', // slate-800
        fontSize: 18,
    },
    totalContainer: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#1e293b', // slate-800
        borderRadius: 12,
        elevation: 4,
    },
    totalText: {
        fontWeight: 'bold',
        fontSize: 18,
        color: 'white',
    },
    totalAmount: {
        fontWeight: 'bold',
        fontSize: 24,
        color: 'white',
    },
    // Graph
    graphContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 288,
        padding: 16,
        backgroundColor: '#f8fafc', // slate-50
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0', // slate-200
    },
    barWrapper: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        paddingTop: 16,
    },
    barChart: {
        flex: 1,
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    bar: {
        width: 32,
        backgroundColor: '#38bdf8', // sky-400
        borderTopLeftRadius: 6,
        borderTopRightRadius: 6,
    },
    barLabel: {
        position: 'absolute',
        top: -4,
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569', // slate-600
    },
    categoryLabel: {
        fontSize: 12,
        color: '#64748b', // slate-500
        marginTop: 8,
    },
});

export default Home;

