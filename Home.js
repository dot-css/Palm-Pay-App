import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Animatable from 'react-native-animatable';
import { Ionicons } from '@expo/vector-icons';
import { useFonts, Anton_400Regular } from '@expo-google-fonts/anton';
import QRCode from 'react-native-qrcode-svg';
import { AudioModule, AudioPlayer } from 'expo-audio';
import * as Notifications from 'expo-notifications';
import { CameraView, Camera } from 'expo-camera';

// Firebase imports
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, collection, getDocs, query, orderBy, limit, onSnapshot, where, addDoc, updateDoc, serverTimestamp, runTransaction } from 'firebase/firestore';
import { auth, db } from './firebase';

// Configure push notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Handle foreground notifications
Notifications.addNotificationReceivedListener(notification => {
  console.log('Foreground notification received:', notification);
  // The notification will be displayed automatically
});

// Handle notification taps
Notifications.addNotificationResponseReceivedListener(response => {
  console.log('Notification tapped:', response);
  // Handle notification tap if needed
});

// Utility function to format dates
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  
  let date;
  if (timestamp?.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else {
    date = new Date(timestamp);
  }
  
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const { width, height } = Dimensions.get('window');

// Dashboard Screen Component
const DashboardScreen = ({ userData, onNavigate, onViewAllTransactions }) => {
  const [balance, setBalance] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const balanceAnim = useRef(new Animated.Value(0)).current;
  const [fontsLoaded] = useFonts({ Anton_400Regular });

  // Update balance whenever userData changes
  useEffect(() => {
    if (userData?.balance !== undefined) {
      setBalance(userData.balance);
      animateBalance(userData.balance);
    }
  }, [userData?.balance]);

  useEffect(() => {
    if (userData) {
      loadDashboardData();
    }
  }, [userData]);

  const loadDashboardData = async () => {
    try {
      if (!userData?.uid) return;
      
      // Get user balance
      const userDoc = await getDoc(doc(db, 'users', userData.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBalance(data.balance || 0);
        animateBalance(data.balance || 0);
      }

      // Get recent transactions (2 for better performance)
      const transactionsRef = collection(db, 'users', userData.uid, 'transactions');
      const transactionsQuery = query(transactionsRef, orderBy('timestamp', 'desc'), limit(5));
      const transactionsSnap = await getDocs(transactionsQuery);
      
      const transactions = [];
      transactionsSnap.forEach(doc => {
        transactions.push({ id: doc.id, ...doc.data() });
      });
      // Show latest transactions (no reverse needed)
      setRecentTransactions(transactions);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      Alert.alert('Error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const animateBalance = (targetBalance) => {
    Animated.timing(balanceAnim, {
      toValue: targetBalance,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const formatDate = (timestamp) => {
    try {
      let date;
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[styles.transactionIcon, { backgroundColor: item.type === 'send' ? '#FEE2E2' : '#DCFCE7' }]}>
          <Ionicons 
            name={item.type === 'send' ? 'arrow-up' : 'arrow-down'} 
            size={16} 
            color={item.type === 'send' ? '#DC2626' : '#16A34A'} 
          />
        </View>
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionName}>
            {item.type === 'send' ? item.recipientName : item.senderName}
          </Text>
          <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
        </View>
      </View>
      <View style={styles.transactionRight}>
        <Text style={[styles.transactionAmount, { color: item.type === 'send' ? '#DC2626' : '#16A34A' }]}>
          {item.type === 'send' ? '-' : '+'}Rs. {item.amount?.toLocaleString()}
        </Text>
      </View>
    </View>
  );

  if (loading || !fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E319D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Dashboard Header */}
        <View style={styles.dashboardHeader}>
          <Text style={styles.dashboardTitle}>Dashboard</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceLabel}>Balance</Text>
            <TouchableOpacity 
              style={styles.qrButton}
              onPress={() => setShowQR(true)}
            >
              <Ionicons name="qr-code" size={18} color="#1E319D" />
            </TouchableOpacity>
          </View>
          <Text style={styles.balanceAmount}>
            Rs. {balance.toLocaleString()}
          </Text>
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity style={styles.viewAllButton} onPress={onViewAllTransactions}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {recentTransactions.length > 0 ? (
            <View style={styles.transactionsContainer}>
              <FlatList
                data={recentTransactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
              />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyStateIcon}>
                <Ionicons name="receipt-outline" size={48} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyStateText}>No recent transactions</Text>
              <Text style={styles.emptyStateSubtext}>Your transactions will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* QR Code Modal */}
      <Modal
        visible={showQR}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowQR(false)}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="slideInUp" style={styles.qrModal}>
            <View style={styles.qrModalHeader}>
              <Text style={styles.qrTitle}>My QR Code</Text>
              <TouchableOpacity onPress={() => setShowQR(false)} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrContent}>
              <View style={styles.qrContainer}>
                <QRCode
                  value={userData?.email || 'user@example.com'}
                  size={220}
                  color="#1E319D"
                  backgroundColor="#ffffff"
                />
              </View>
              
              <View style={styles.qrInfo}>
                <Text style={styles.qrEmail}>{userData?.email}</Text>
                <Text style={styles.qrDescription}>
                  Show this QR code to receive payments instantly
                </Text>
              </View>
              
            </View>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

// Send Money Screen Component
const SendMoneyScreen = ({ userData, onNavigate, onUserDataUpdate, scannedEmail, onClearScannedEmail }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentRecipients, setRecentRecipients] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [confirmationComplete, setConfirmationComplete] = useState(false);

  useEffect(() => {
    if (userData) {
      loadRecentRecipients();
    }
  }, [userData]);

  // Handle scanned email - automatically search and select user
  useEffect(() => {
    if (scannedEmail && !selectedRecipient) {
      // Search for user with scanned email and auto-select
      searchAndSelectRecipient(scannedEmail);
      onClearScannedEmail(); // Clear the scanned email after using it
    }
  }, [scannedEmail]);

  const searchAndSelectRecipient = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 3) return;

    setIsSearching(true);
    try {
      // Search users in Firebase
      const usersRef = collection(db, 'users');
      let searchQueryRef;
      
      if (searchTerm.includes('@')) {
        // Search by email
        searchQueryRef = query(usersRef, where('email', '==', searchTerm.toLowerCase()));
      } else {
        // Search by CNIC
        searchQueryRef = query(usersRef, where('cnic', '==', searchTerm));
      }
      
      const searchSnap = await getDocs(searchQueryRef);
      const results = [];
      
      searchSnap.forEach(doc => {
        const data = doc.data();
        if (doc.id !== userData.uid) { // Don't include current user
          results.push({
            id: doc.id,
            name: data.displayName || data.fullName || 'User',
            email: data.email,
            cnic: data.cnic
          });
        }
      });
      
      // Auto-select the first user found
      if (results.length > 0) {
        setSelectedRecipient(results[0]);
        console.log('Auto-selected recipient from QR scan:', results[0]);
      } else {
        Alert.alert('User Not Found', 'No user found with this QR code.');
      }
    } catch (error) {
      console.error('Error searching recipients:', error);
      Alert.alert('Error', 'Failed to search for user. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const loadRecentRecipients = async () => {
    try {
      if (!userData?.uid) return;
      
      // Load recent transactions to get recipients - simplified query to avoid index requirement
      const transactionsRef = collection(db, 'users', userData.uid, 'transactions');
      const transactionsQuery = query(
        transactionsRef, 
        orderBy('timestamp', 'desc'), 
        limit(20)
      );
      
      const transactionsSnap = await getDocs(transactionsQuery);
      const recipients = [];
      const uniqueRecipients = new Set();
      
      transactionsSnap.forEach(doc => {
        const data = doc.data();
        // Filter by type in code instead of query to avoid index requirement
        if (data.type === 'send' && data.recipientId && !uniqueRecipients.has(data.recipientId)) {
          uniqueRecipients.add(data.recipientId);
          recipients.push({
            id: data.recipientId,
            name: data.recipientName || 'Unknown',
            email: data.recipientEmail || '',
            cnic: data.recipientCnic || '',
            lastAmount: data.amount || 0
          });
        }
      });
      
      setRecentRecipients(recipients);
    } catch (error) {
      console.error('Error loading recent recipients:', error);
    }
  };

  const searchRecipients = async (searchTerm) => {
    if (!searchTerm || searchTerm.length < 3) {
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      // Search users in Firebase
      const usersRef = collection(db, 'users');
      let searchQueryRef;
      
      if (searchTerm.includes('@')) {
        // Search by email
        searchQueryRef = query(usersRef, where('email', '==', searchTerm.toLowerCase()));
      } else {
        // Search by CNIC
        searchQueryRef = query(usersRef, where('cnic', '==', searchTerm));
      }
      
      const searchSnap = await getDocs(searchQueryRef);
      const results = [];
      
      searchSnap.forEach(doc => {
        const data = doc.data();
        if (doc.id !== userData.uid) { // Don't include current user
          results.push({
            id: doc.id,
            name: data.displayName || data.fullName || 'User',
            email: data.email,
            cnic: data.cnic
          });
        }
      });
      
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching recipients:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const selectRecipient = (recipient) => {
    setSelectedRecipient(recipient);
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const validateAndProceed = () => {
    if (!selectedRecipient) {
      Alert.alert('Error', 'Please select a recipient');
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (amountValue > (userData?.balance || 0)) {
      Alert.alert('Error', 'Insufficient balance');
      return;
    }

    setShowConfirmation(true);
  };

  const processTransaction = async () => {
    setIsProcessing(true);
    
    try {
      const amountValue = parseFloat(amount);
      
      // Generate unique transaction ID
      const transactionId = `tx_${Date.now()}_${userData.uid.substring(0, 6)}`;
      const timestamp = new Date();
      
      // Create transaction record
      const transactionData = {
        id: transactionId,
        type: 'send',
        amount: amountValue,
        recipientId: selectedRecipient.id,
        recipientName: selectedRecipient.name,
        recipientEmail: selectedRecipient.email,
        recipientCnic: selectedRecipient.cnic,
        senderId: userData.uid,
        senderName: userData.displayName || userData.fullName,
        senderEmail: userData.email,
        note: note.trim(),
        status: 'completed',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };

      // Create recipient transaction record
      const recipientTransactionData = {
        id: transactionId,
        type: 'receive',
        amount: amountValue,
        senderId: userData.uid,
        senderName: userData.displayName || userData.fullName,
        senderEmail: userData.email,
        recipientId: selectedRecipient.id,
        recipientName: selectedRecipient.name,
        note: note.trim(),
        status: 'completed',
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString()
      };
      
      // Use Firestore transaction for atomic operations
      await runTransaction(db, async (transaction) => {
        // Get current user balance
        const senderRef = doc(db, 'users', userData.uid);
        const senderDoc = await transaction.get(senderRef);
        
        // Get recipient balance
        const recipientRef = doc(db, 'users', selectedRecipient.id);
        const recipientDoc = await transaction.get(recipientRef);
        
        if (!senderDoc.exists()) {
          throw new Error('Sender account not found');
        }
        
        if (!recipientDoc.exists()) {
          throw new Error('Recipient account not found');
        }
        
        const senderData = senderDoc.data();
        const recipientData = recipientDoc.data();
        
        const newSenderBalance = (senderData.balance || 0) - amountValue;
        const newRecipientBalance = (recipientData.balance || 0) + amountValue;
        
        if (newSenderBalance < 0) {
          throw new Error('Insufficient balance');
        }
        
        // Update balances atomically
        transaction.update(senderRef, { balance: newSenderBalance });
        transaction.update(recipientRef, { balance: newRecipientBalance });
      });
      
      // Add transaction records after successful balance update
      await addDoc(collection(db, 'users', userData.uid, 'transactions'), transactionData);
      await addDoc(collection(db, 'users', selectedRecipient.id, 'transactions'), recipientTransactionData);

      // Create notifications for both sender and recipient
      try {
        const senderNotification = {
          id: `notif_${Date.now()}_${userData.uid.substring(0, 6)}`,
          type: 'transaction_sent',
          title: 'Money Sent',
          message: `You sent Rs. ${amountValue.toLocaleString()} to ${selectedRecipient.name}`,
          amount: amountValue,
          recipientName: selectedRecipient.name,
          recipientEmail: selectedRecipient.email,
          transactionId: transactionId,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        };

        const recipientNotification = {
          id: `notif_${Date.now()}_${selectedRecipient.id.substring(0, 6)}`,
          type: 'transaction_received',
          title: 'Money Received',
          message: `You received Rs. ${amountValue.toLocaleString()} from ${userData.displayName || userData.fullName}`,
          amount: amountValue,
          senderName: userData.displayName || userData.fullName,
          senderEmail: userData.email,
          transactionId: transactionId,
          timestamp: serverTimestamp(),
          createdAt: new Date().toISOString()
        };

        // Add notifications to Firebase
        console.log('Creating sender notification for:', userData.uid);
        await addDoc(collection(db, 'users', userData.uid, 'notifications'), senderNotification);
        
        console.log('Creating recipient notification for:', selectedRecipient.id);
        await addDoc(collection(db, 'users', selectedRecipient.id, 'notifications'), recipientNotification);

        console.log('Notifications created successfully');
      } catch (notificationError) {
        console.error('Error creating notifications:', notificationError);
        // Don't fail the transaction if notifications fail
      }

      // Play transaction success sound
      playTransactionSound();
      
      // Show completion animation
      setConfirmationComplete(true);
      
      // Refresh user data immediately after successful transaction
      if (onUserDataUpdate) {
        onUserDataUpdate();
      }
      
      // Wait for animation to complete
      setTimeout(() => {
        setShowConfirmation(false);
        setConfirmationComplete(false);
        setAmount('');
        setNote('');
        setSelectedRecipient(null);
      }, 3000);
      
    } catch (error) {
      console.error('Transaction error:', error);
      Alert.alert('Transaction Failed', error.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmPayment = () => {
    processTransaction();
  };

  const formatCNIC = (cnic) => {
    if (!cnic) return '';
    const digits = cnic.replace(/\D/g, '');
    if (digits.length !== 13) return cnic;
    return `${digits.substring(0, 5)}-${digits.substring(5, 12)}-${digits.substring(12, 13)}`;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(word => word[0]).join('').toUpperCase().slice(0, 2);
  };

  const renderSearchResult = ({ item }) => (
    <TouchableOpacity onPress={() => selectRecipient(item)}>
      <Animatable.View animation="fadeInUp" style={styles.searchResultItem}>
        <View style={styles.recipientAvatar}>
          <Text style={styles.recipientAvatarText}>{getInitials(item.name)}</Text>
        </View>
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.name}</Text>
          {item.email && <Text style={styles.recipientDetail}>{item.email}</Text>}
          {item.cnic && <Text style={styles.recipientDetail}>CNIC: {formatCNIC(item.cnic)}</Text>}
        </View>
      </Animatable.View>
    </TouchableOpacity>
  );

  const renderRecentRecipient = ({ item }) => (
    <TouchableOpacity onPress={() => selectRecipient(item)}>
      <Animatable.View animation="fadeInUp" style={styles.recentRecipientItem}>
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientName}>{item.name}</Text>
          <Text style={styles.recipientDetail}>{item.email || formatCNIC(item.cnic)}</Text>
          {item.lastAmount && (
            <Text style={styles.lastSentAmount}>Last: Rs. {item.lastAmount.toLocaleString()}</Text>
          )}
        </View>
        <View style={styles.sendAgainIcon}>
          <Ionicons name="paper-plane" size={16} color="#1E319D" />
        </View>
      </Animatable.View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.sendMoneyHeader}>
          <Text style={styles.sendMoneyTitle}>Send Money</Text>
          <Text style={styles.sendMoneyBalance}>Rs. {userData?.balance?.toLocaleString() || '0'}</Text>
        </View>

        {!selectedRecipient ? (
          <>
            {/* Search Section */}
            <View style={styles.searchSection}>
              <View style={styles.searchInputContainer}>
                <Ionicons name="search" size={18} color="#9CA3AF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by email or CNIC"
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    searchRecipients(text);
                  }}
                  placeholderTextColor="#9CA3AF"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity 
                    onPress={() => {
                      setSearchQuery('');
                      setShowSearchResults(false);
                    }}
                    style={styles.clearButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Search Results */}
              {showSearchResults && (
                <View style={styles.searchResultsContainer}>
                  {isSearching ? (
                    <View style={styles.searchLoading}>
                      <ActivityIndicator color="#1E319D" />
                      <Text style={styles.searchLoadingText}>Searching...</Text>
                    </View>
                  ) : searchResults.length > 0 ? (
                    <FlatList
                      data={searchResults}
                      renderItem={renderSearchResult}
                      keyExtractor={(item) => item.id}
                      scrollEnabled={false}
                    />
                  ) : (
                    <View style={styles.noResults}>
                      <Ionicons name="person-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.noResultsText}>No recipients found</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Recent Recipients */}
            {!showSearchResults && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Recent</Text>
                </View>

                {recentRecipients.length > 0 ? (
                  <FlatList
                    data={recentRecipients}
                    renderItem={renderRecentRecipient}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="people-outline" size={48} color="#9CA3AF" />
                    <Text style={styles.emptyStateText}>No recent recipients</Text>
                  </View>
                )}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Selected Recipient */}
            <View style={styles.selectedRecipientSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recipient</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedRecipient(null)}
                  style={styles.changeButton}
                >
                  <Text style={styles.changeButtonText}>Change</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.selectedRecipientCard}>
                <View style={styles.largeRecipientAvatar}>
                  <Text style={styles.largeAvatarText}>{getInitials(selectedRecipient.name)}</Text>
                </View>
                <View style={styles.selectedRecipientInfo}>
                  <Text style={styles.selectedRecipientName}>{selectedRecipient.name}</Text>
                  {selectedRecipient.email && (
                    <Text style={styles.selectedRecipientDetail}>{selectedRecipient.email}</Text>
                  )}
                  {selectedRecipient.cnic && (
                    <Text style={styles.selectedRecipientDetail}>CNIC: {formatCNIC(selectedRecipient.cnic)}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.section}>
              <View style={styles.formGroup}>
                <Text style={styles.formGroupTitle}>Amount</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencySymbol}>Rs.</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0.00"
                    value={amount}
                    onChangeText={(text) => {
                      // Only allow numbers and one decimal point
                      const numericValue = text.replace(/[^0-9.]/g, '');
                      if (numericValue.split('.').length <= 2) {
                        setAmount(numericValue);
                      }
                    }}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.balanceInfo}>Available: Rs. {userData?.balance?.toLocaleString() || '0'}</Text>
              </View>
            </View>

            {/* Note Input */}
            <View style={styles.section}>
              <View style={styles.formGroup}>
                <Text style={styles.formGroupTitle}>Note (Optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Add a note"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  maxLength={100}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            {/* Send Button */}
            <View style={styles.sendButtonContainer}>
              <TouchableOpacity 
                style={[
                  styles.sendButton, 
                  (!selectedRecipient || !amount || parseFloat(amount) <= 0) && styles.sendButtonDisabled
                ]}
                onPress={validateAndProceed}
                disabled={!selectedRecipient || !amount || parseFloat(amount) <= 0}
              >
                <Text style={styles.sendButtonText}>Send Money</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showConfirmation}
        transparent={true}
        animationType="slide"
        onRequestClose={() => !isProcessing && setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {confirmationComplete ? (
              // Success Screen
              <View style={styles.successScreen}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
                </View>
                <Text style={styles.successTitle}>Transaction Complete!</Text>
                <Text style={styles.successMessage}>
                  Rs. {parseFloat(amount || 0).toLocaleString()} sent successfully
                </Text>
                <TouchableOpacity 
                  style={styles.doneButton}
                  onPress={() => {
                    setShowConfirmation(false);
                    setConfirmationComplete(false);
                  }}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Header */}
                <View style={styles.modalHeader}>
                  <TouchableOpacity 
                    onPress={() => setShowConfirmation(false)}
                    style={styles.closeButton}
                    disabled={isProcessing}
                  >
                    <Ionicons name="close" size={24} color="#333" />
                  </TouchableOpacity>
                  <Text style={styles.modalTitle}>Confirm Payment</Text>
                  <View style={styles.headerSpacer} />
                </View>

                {/* Content */}
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Recipient */}
                  <View style={styles.recipientSection}>
                    <View style={styles.recipientAvatar}>
                      <Text style={styles.recipientInitials}>
                        {getInitials(selectedRecipient?.name)}
                      </Text>
                    </View>
                    <Text style={styles.recipientName}>{selectedRecipient?.name}</Text>
                    <Text style={styles.recipientEmail}>{selectedRecipient?.email}</Text>
                  </View>

                  {/* Amount */}
                  <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>Amount</Text>
                    <Text style={styles.amountValue}>
                      Rs. {parseFloat(amount || 0).toLocaleString()}
                    </Text>
                    {note.trim() && (
                      <View style={styles.noteContainer}>
                        <Text style={styles.noteText}>"{note.trim()}"</Text>
                      </View>
                    )}
                  </View>

                  {/* Details */}
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>From</Text>
                      <Text style={styles.detailValue}>{userData?.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>To</Text>
                      <Text style={styles.detailValue}>{selectedRecipient?.email}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Fee</Text>
                      <Text style={styles.detailValue}>Rs. 0.00</Text>
                    </View>
                    <View style={[styles.detailRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total</Text>
                      <Text style={styles.totalValue}>
                        Rs. {parseFloat(amount || 0).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.actionSection}>
                  {isProcessing ? (
                    <View style={styles.processingContainer}>
                      <ActivityIndicator size="large" color="#1E319D" />
                      <Text style={styles.processingText}>Processing...</Text>
                    </View>
                  ) : (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity 
                        style={styles.cancelButton}
                        onPress={() => setShowConfirmation(false)}
                      >
                        <Text style={styles.cancelButtonText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.confirmButton}
                        onPress={handleConfirmPayment}
                      >
                        <Text style={styles.confirmButtonText}>Confirm Payment</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Send local push notification
const sendLocalPushNotification = async (title, message, data = {}) => {
  try {
    console.log('Sending local notification:', title, message);
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body: message,
        data,
        sound: 'new_notification_09_352705.mp3', // Use our custom sound
      },
      trigger: null, // Show immediately
    });
    
    console.log('Local notification sent successfully');
  } catch (error) {
    console.error('Error sending local notification:', error);
  }
};

  // Play transaction sound
  const playTransactionSound = async () => {
    try {
      console.log('🔊 Transaction completed with sound!');
      // Play transaction sound file
      const player = new AudioPlayer(require('./assets/transaction.mp3'));
      await player.play();
    } catch (error) {
      console.log('Could not play transaction sound:', error);
    }
  };

  // Play notification sound
  const playNotificationSound = async () => {
    try {
      console.log('🔔 New notification with sound!');
      // Play notification sound file
      const player = new AudioPlayer(require('./assets/new_notification_09_352705.mp3'));
      await player.play();
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };// Notifications Screen Component
const NotificationsScreen = ({ userData, onNavigate }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userData) {
      loadNotifications();
      // The main Home component will handle the listener
    }
  }, [userData]);

  const loadNotifications = async () => {
    try {
      if (!userData?.uid) return;
      
      const notificationsRef = collection(db, 'users', userData.uid, 'notifications');
      const notificationsQuery = query(notificationsRef, orderBy('timestamp', 'desc'), limit(20));
      const notificationsSnap = await getDocs(notificationsQuery);
      
      const notifs = [];
      notificationsSnap.forEach(doc => {
        notifs.push({ id: doc.id, ...doc.data() });
      });
      setNotifications(notifs);

    } catch (error) {
      console.error('Error loading notifications:', error);
      Alert.alert('Error', 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    try {
      let date;
      if (timestamp?.toDate) {
        date = timestamp.toDate();
      } else {
        date = new Date(timestamp);
      }
      
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      return 'Just now';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const renderNotification = ({ item }) => (
    <View style={styles.notificationItemContainer}>
      <View style={styles.notificationCard}>
        <View style={styles.notificationIconContainer}>
          <View style={[styles.notificationIcon, { backgroundColor: item.type?.includes('transaction') ? '#E3F2FD' : '#F3E5F5' }]}>
            <Ionicons 
              name={item.type?.includes('transaction') ? 'swap-horizontal' : 'notifications'} 
              size={20} 
              color={item.type?.includes('transaction') ? '#1976D2' : '#7B1FA2'} 
            />
          </View>
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{item.title}</Text>
            <Text style={styles.notificationTime}>{formatTimeAgo(item.timestamp)}</Text>
          </View>
          <Text style={styles.notificationMessage}>{item.message}</Text>
          {item.amount && (
            <View style={styles.notificationAmountContainer}>
              <Text style={[styles.notificationAmount, { color: item.type?.includes('received') ? '#16A34A' : '#DC2626' }]}>
                Rs. {item.amount.toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E319D" />
        <Text style={styles.loadingText}>Loading notifications...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Header */}
      <View style={styles.notificationsHeader}>
        <View style={styles.notificationsHeaderContent}>
          <Text style={styles.notificationsTitle}>Notifications</Text>
        </View>
      </View>
      
      {notifications.length > 0 ? (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.notificationsListContainer}
          ItemSeparatorComponent={() => <View style={styles.notificationSeparator} />}
        />
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={styles.emptyNotificationsContainer}
        >
          <View style={styles.emptyNotificationsState}>
            <View style={styles.emptyNotificationsIcon}>
              <Ionicons name="notifications-outline" size={64} color="#9CA3AF" />
            </View>
            <Text style={styles.emptyNotificationsTitle}>No notifications yet</Text>
            <Text style={styles.emptyNotificationsSubtext}>
              You'll receive notifications here when someone sends you money or when your transactions are processed
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// Transactions Modal Component
const TransactionsModal = ({ visible, onClose, userData }) => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [filterType, setFilterType] = useState('all'); // all, sent, received
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    if (visible && userData) {
      loadAllTransactions();
    }
  }, [visible, userData]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filterType, dateFilter]);

  const loadAllTransactions = async () => {
    setLoading(true);
    try {
      if (!userData?.uid) {
        console.log('No user ID available');
        return;
      }
      
      console.log('Loading transactions for user:', userData.uid);
      
      // Load transactions from user's subcollection
      const transactionsRef = collection(db, 'users', userData.uid, 'transactions');
      const transactionsQuery = query(
        transactionsRef, 
        orderBy('timestamp', 'desc')
      );
      
      const transactionsSnap = await getDocs(transactionsQuery);
      
      console.log('Transaction documents found:', transactionsSnap.size);
      
      const loadedTransactions = [];
      transactionsSnap.forEach(doc => {
        const data = doc.data();
        console.log('Transaction data:', { id: doc.id, ...data });
        loadedTransactions.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp || new Date()
        });
      });

      console.log('Total transactions loaded:', loadedTransactions.length);
      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Error', 'Unable to load transactions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Filter by type
    if (filterType === 'sent') {
      filtered = filtered.filter(t => t.type === 'send');
    } else if (filterType === 'received') {
      filtered = filtered.filter(t => t.type === 'receive');
    }

    // Filter by date
    const now = new Date();
    if (dateFilter === 'today') {
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      filtered = filtered.filter(t => {
        const transactionDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return transactionDate >= today;
      });
    } else if (dateFilter === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => {
        const transactionDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return transactionDate >= weekAgo;
      });
    } else if (dateFilter === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(t => {
        const transactionDate = t.timestamp?.toDate ? t.timestamp.toDate() : new Date(t.timestamp);
        return transactionDate >= monthAgo;
      });
    }

    setFilteredTransactions(filtered);
  };

  const showTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetail(true);
  };

  const renderTransactionItem = ({ item }) => (
    <TouchableOpacity onPress={() => showTransactionDetails(item)}>
      <View style={styles.modalTransactionItem}>
        <View style={styles.transactionLeft}>
          <View style={[
            styles.transactionIcon, 
            { backgroundColor: item.type === 'send' ? '#FEE2E2' : '#DCFCE7' }
          ]}>
            <Ionicons 
              name={item.type === 'send' ? 'arrow-up' : 'arrow-down'} 
              size={20} 
              color={item.type === 'send' ? '#DC2626' : '#16A34A'} 
            />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionName}>
              {item.type === 'send' ? item.recipientName || 'Recipient' : item.senderName || 'Sender'}
            </Text>
            <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
          </View>
        </View>
        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: item.type === 'send' ? '#DC2626' : '#16A34A' }]}>
            {item.type === 'send' ? '-' : '+'}Rs. {item.amount?.toLocaleString() || '0'}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: item.status === 'completed' ? '#DCFCE7' : '#FEF3C7' }]}>
            <Text style={[styles.transactionStatus, { color: item.status === 'completed' ? '#16A34A' : '#D97706' }]}>
              {(item.status || 'completed').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Animatable.View animation="slideInUp" style={styles.transactionsModalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>All Transactions</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Filters */}
          <View style={styles.filtersContainer}>
            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Type:</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity 
                  style={[styles.filterButton, filterType === 'all' && styles.activeFilterButton]}
                  onPress={() => setFilterType('all')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'all' && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterButton, filterType === 'sent' && styles.activeFilterButton]}
                  onPress={() => setFilterType('sent')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'sent' && styles.activeFilterText]}>Sent</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterButton, filterType === 'received' && styles.activeFilterButton]}
                  onPress={() => setFilterType('received')}
                >
                  <Text style={[styles.filterButtonText, filterType === 'received' && styles.activeFilterText]}>Received</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterRow}>
              <Text style={styles.filterLabel}>Date:</Text>
              <View style={styles.filterButtons}>
                <TouchableOpacity 
                  style={[styles.filterButton, dateFilter === 'all' && styles.activeFilterButton]}
                  onPress={() => setDateFilter('all')}
                >
                  <Text style={[styles.filterButtonText, dateFilter === 'all' && styles.activeFilterText]}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterButton, dateFilter === 'today' && styles.activeFilterButton]}
                  onPress={() => setDateFilter('today')}
                >
                  <Text style={[styles.filterButtonText, dateFilter === 'today' && styles.activeFilterText]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterButton, dateFilter === 'week' && styles.activeFilterButton]}
                  onPress={() => setDateFilter('week')}
                >
                  <Text style={[styles.filterButtonText, dateFilter === 'week' && styles.activeFilterText]}>Week</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.filterButton, dateFilter === 'month' && styles.activeFilterButton]}
                  onPress={() => setDateFilter('month')}
                >
                  <Text style={[styles.filterButtonText, dateFilter === 'month' && styles.activeFilterText]}>Month</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Results Summary */}
          <View style={styles.resultsSummary}>
            <Text style={styles.resultsText}>
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} found
            </Text>
            <TouchableOpacity onPress={loadAllTransactions} style={styles.refreshButton}>
              <Ionicons name="refresh" size={16} color="#1E319D" />
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          {loading ? (
            <View style={styles.transactionsLoadingContainer}>
              <ActivityIndicator size="large" color="#1E319D" />
              <Text style={styles.transactionsLoadingText}>Loading transactions...</Text>
            </View>
          ) : filteredTransactions.length > 0 ? (
            <FlatList
              data={filteredTransactions}
              renderItem={renderTransactionItem}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.transactionsList}
              contentContainerStyle={styles.transactionsListContent}
              ItemSeparatorComponent={() => <View style={styles.transactionSeparator} />}
            />
          ) : (
            <View style={styles.emptyTransactionsStateContainer}>
              <View style={styles.emptyTransactionsStateIcon}>
                <Ionicons name="receipt-outline" size={64} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTransactionsStateText}>No transactions found</Text>
              <Text style={styles.emptyTransactionsStateSubtext}>
                {filterType !== 'all' || dateFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Your transactions will appear here'
                }
              </Text>
            </View>
          )}

          {/* Transaction Detail Modal */}
          <Modal
            visible={showTransactionDetail}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowTransactionDetail(false)}
          >
            <View style={styles.modalOverlay}>
              <Animatable.View animation="slideInUp" style={styles.transactionDetailModal}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Transaction Details</Text>
                  <TouchableOpacity onPress={() => setShowTransactionDetail(false)} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedTransaction && (
                  <View style={styles.transactionDetailContent}>
                    <View style={styles.transactionModalAmount}>
                      <Text style={[
                        styles.modalAmountText,
                        { color: selectedTransaction.type === 'send' ? '#DC2626' : '#16A34A' }
                      ]}>
                        {selectedTransaction.type === 'send' ? '-' : '+'}Rs. {selectedTransaction.amount?.toLocaleString() || '0'}
                      </Text>
                      <Text style={styles.modalTransactionType}>
                        {selectedTransaction.type === 'send' ? 'Money Sent' : 'Money Received'}
                      </Text>
                    </View>

                    <View style={styles.transactionModalDetails}>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Status</Text>
                        <Text style={styles.modalDetailValue}>{selectedTransaction.status || 'Completed'}</Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>Date & Time</Text>
                        <Text style={styles.modalDetailValue}>{formatDate(selectedTransaction.timestamp)}</Text>
                      </View>
                      <View style={styles.modalDetailRow}>
                        <Text style={styles.modalDetailLabel}>
                          {selectedTransaction.type === 'send' ? 'Recipient' : 'Sender'}
                        </Text>
                        <Text style={styles.modalDetailValue}>
                          {selectedTransaction.type === 'send' 
                            ? selectedTransaction.recipientName || 'Unknown' 
                            : selectedTransaction.senderName || 'Unknown'
                          }
                        </Text>
                      </View>
                      {selectedTransaction.note && (
                        <View style={styles.modalDetailRow}>
                          <Text style={styles.modalDetailLabel}>Note</Text>
                          <Text style={styles.modalDetailValue}>{selectedTransaction.note}</Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity 
                      style={styles.closeDetailButton}
                      onPress={() => setShowTransactionDetail(false)}
                    >
                      <Text style={styles.closeDetailButtonText}>Close</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Animatable.View>
            </View>
          </Modal>
        </Animatable.View>
      </View>
    </Modal>
  );
};

// Profile Screen Component
const ProfileScreen = ({ userData, onNavigate, onLogout }) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setIsChangingPassword(true);
    
    try {
      // Here you would implement actual password change logic
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      
      Alert.alert('Success', 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowSettingsModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to change password. Please try again.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const formatCNIC = (cnic) => {
    if (!cnic) return 'Not Available';
    if (cnic.includes('-')) return cnic;
    if (cnic.length === 13) {
      return `${cnic.substr(0, 5)}-${cnic.substr(5, 7)}-${cnic.substr(12)}`;
    }
    return cnic;
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Enhanced Profile Header */}
        <View style={styles.profileHeaderContainer}>
          <View style={styles.profileHeaderContent}>
            <Text style={styles.profileScreenTitle}>Profile</Text>
            <TouchableOpacity 
              style={styles.profileSettingsButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name="settings-outline" size={24} color="#1E319D" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Enhanced Account Information Card */}
        <View style={styles.profileAccountInfoCard}>
          <View style={styles.profileCardHeaderSection}>
            <View style={styles.profileCardIconTitleRow}>
              <Ionicons name="person-circle" size={24} color="#1E319D" />
              <Text style={styles.profileCardTitleText}>Account Information</Text>
            </View>
          </View>

          <View style={styles.profileAvatarSectionContainer}>
            <View style={styles.profileUserAvatar}>
              <Text style={styles.profileUserAvatarText}>
                {getInitials(userData?.fullName)}
              </Text>
            </View>
            <Text style={styles.profileUserDisplayName}>{userData?.fullName || 'User Name'}</Text>
            <Text style={styles.profileUserEmailAddress}>{userData?.email || 'email@example.com'}</Text>
          </View>

          <View style={styles.profileInformationGrid}>
            <View style={styles.profileInfoRowContainer}>
              <Text style={styles.profileInfoLabelText}>Full Name</Text>
              <Text style={styles.profileInfoValueText}>{userData?.fullName || 'Not Available'}</Text>
            </View>
            <View style={styles.profileInfoRowContainer}>
              <Text style={styles.profileInfoLabelText}>Father's Name</Text>
              <Text style={styles.profileInfoValueText}>{userData?.fatherName || 'Not Available'}</Text>
            </View>
            <View style={styles.profileInfoRowContainer}>
              <Text style={styles.profileInfoLabelText}>CNIC</Text>
              <Text style={styles.profileInfoValueText}>{formatCNIC(userData?.cnic)}</Text>
            </View>
            <View style={styles.profileInfoRowContainer}>
              <Text style={styles.profileInfoLabelText}>Email</Text>
              <Text style={styles.profileInfoValueText}>{userData?.email || 'Not Available'}</Text>
            </View>
            <View style={styles.profileInfoRowContainer}>
              <Text style={styles.profileInfoLabelText}>Account Balance</Text>
              <Text style={[styles.profileInfoValueText, styles.profileBalanceText]}>
                Rs. {userData?.balance?.toLocaleString() || '0'}
              </Text>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <View style={styles.profileLogoutSection}>
          <TouchableOpacity style={styles.profileLogoutButton} onPress={onLogout}>
            <Ionicons name="log-out" size={20} color="#DC2626" />
            <Text style={styles.profileLogoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View style={styles.settingsModalOverlay}>
          <View style={styles.settingsModalContainer}>
            {/* Settings Modal Header */}
            <View style={styles.settingsModalHeader}>
              <Text style={styles.settingsModalTitle}>Settings</Text>
              <TouchableOpacity 
                onPress={() => setShowSettingsModal(false)} 
                style={styles.settingsCloseButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsModalContent} showsVerticalScrollIndicator={false}>
              {/* Change Password Section */}
              <View style={styles.settingsPasswordSection}>
                <View style={styles.settingsPasswordHeader}>
                  <Ionicons name="lock-closed" size={24} color="#1E319D" />
                  <Text style={styles.settingsPasswordTitle}>Change Password</Text>
                </View>

                <View style={styles.settingsPasswordForm}>
                  <View style={styles.settingsPasswordInputGroup}>
                    <Text style={styles.settingsPasswordLabel}>Current Password</Text>
                    <View style={styles.settingsPasswordInputContainer}>
                      <TextInput
                        style={styles.settingsPasswordInput}
                        placeholder="Enter your current password"
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry={!showCurrentPassword}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.settingsPasswordToggle}
                        onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        <Ionicons 
                          name={showCurrentPassword ? 'eye-off' : 'eye'} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingsPasswordInputGroup}>
                    <Text style={styles.settingsPasswordLabel}>New Password</Text>
                    <View style={styles.settingsPasswordInputContainer}>
                      <TextInput
                        style={styles.settingsPasswordInput}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.settingsPasswordToggle}
                        onPress={() => setShowNewPassword(!showNewPassword)}
                      >
                        <Ionicons 
                          name={showNewPassword ? 'eye-off' : 'eye'} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.settingsPasswordInputGroup}>
                    <Text style={styles.settingsPasswordLabel}>Confirm New Password</Text>
                    <View style={styles.settingsPasswordInputContainer}>
                      <TextInput
                        style={styles.settingsPasswordInput}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        placeholderTextColor="#9CA3AF"
                      />
                      <TouchableOpacity 
                        style={styles.settingsPasswordToggle}
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        <Ionicons 
                          name={showConfirmPassword ? 'eye-off' : 'eye'} 
                          size={20} 
                          color="#6B7280" 
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={[styles.settingsUpdatePasswordButton, isChangingPassword && styles.settingsButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Ionicons name="save" size={20} color="#ffffff" />
                    )}
                    <Text style={styles.settingsUpdatePasswordButtonText}>
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// QR Scanner Screen Component
const QRScannerScreen = ({ onNavigate, onScanResult }) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };

    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    console.log('QR Code scanned:', data);
    
    // Check if it's an email or user data
    let scannedEmail = data;
    try {
      // Try to parse as JSON in case it contains user data
      const parsedData = JSON.parse(data);
      if (parsedData.email) {
        scannedEmail = parsedData.email;
      }
    } catch (e) {
      // If not JSON, treat as plain email
      scannedEmail = data;
    }

    // Validate if it's an email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(scannedEmail)) {
      // Directly send the scanned email and navigate to send money
      onScanResult(scannedEmail);
      onNavigate('send');
    } else {
      Alert.alert(
        'Invalid QR Code',
        'Please scan a valid QR code containing an email address.',
        [{ text: 'OK', onPress: () => setScanned(false) }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.scannerContainer}>
        <ActivityIndicator size="large" color="#1E319D" />
        <Text style={styles.scannerText}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.scannerContainer}>
        <View style={styles.scannerContent}>
          <Ionicons name="camera-outline" size={64} color="#9CA3AF" />
          <Text style={styles.scannerTitle}>Camera Permission Required</Text>
          <Text style={styles.scannerText}>
            Please enable camera access in your device settings to scan QR codes.
          </Text>
          <TouchableOpacity 
            style={styles.scannerButton}
            onPress={() => onNavigate('dashboard')}
          >
            <Text style={styles.scannerButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      {/* Header */}
      <View style={styles.scannerHeader}>
        <TouchableOpacity 
          style={styles.scannerBackButton}
          onPress={() => onNavigate('dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.scannerHeaderTitle}>Scan QR Code</Text>
        <View style={styles.scannerHeaderSpacer} />
      </View>

      {/* Scanner View */}
      <View style={styles.scannerViewContainer}>
        <CameraView
          style={styles.scannerView}
          facing={'back'}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "pdf417"],
          }}
        />
        
        {/* Scanner Overlay */}
        <View style={styles.scannerOverlay}>
          <View style={styles.scannerFrame}>
            <View style={[styles.scannerCorner, styles.scannerCornerTopLeft]} />
            <View style={[styles.scannerCorner, styles.scannerCornerTopRight]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBottomLeft]} />
            <View style={[styles.scannerCorner, styles.scannerCornerBottomRight]} />
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.scannerInstructions}>
        <Text style={styles.scannerInstructionTitle}>Point camera at QR code</Text>
        <Text style={styles.scannerInstructionText}>
          Scan a QR code containing an email address to quickly send money
        </Text>
        
        {scanned && (
          <TouchableOpacity
            style={styles.scannerRetryButton}
            onPress={() => setScanned(false)}
          >
            <Ionicons name="refresh" size={20} color="#1E319D" />
            <Text style={styles.scannerRetryText}>Scan Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

// Main Home Component
const Home = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [scannedEmail, setScannedEmail] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ uid: user.uid, ...userDoc.data() });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Setup real-time user data listener for balance updates
  useEffect(() => {
    if (userData?.uid) {
      const userDocRef = doc(db, 'users', userData.uid);
      const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData({ uid: userData.uid, ...doc.data() });
        }
      }, (error) => {
        console.error('Error listening to user data:', error);
      });

      return () => {
        if (unsubscribeUser) {
          unsubscribeUser();
        }
      };
    }
  }, [userData?.uid]);

  // Setup push notifications and notification listener
  useEffect(() => {
    if (userData?.uid) {
      setupPushNotifications();
      
      // Setup real-time notification listener
      const notificationsRef = collection(db, 'users', userData.uid, 'notifications');
      const notificationsQuery = query(notificationsRef, orderBy('timestamp', 'desc'), limit(50));
      
      const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notifs = [];
        const newNotifications = [];
        
        snapshot.forEach(doc => {
          const notifData = { id: doc.id, ...doc.data() };
          notifs.push(notifData);
          
          // Check if this is a new notification (not seen before)
          const isNewNotification = !notifications.some(existing => existing.id === notifData.id);
          if (isNewNotification && notifications.length > 0) { // Don't show notifications on first load
            newNotifications.push(notifData);
          }
        });
        
        // Send push notification and play sound for each new notification
        newNotifications.forEach(notif => {
          console.log('New notification received:', notif.title, notif.message);
          
          // Send local push notification
          sendLocalPushNotification(
            notif.title || 'New Notification',
            notif.message || 'You have a new notification',
            { type: notif.type, notificationId: notif.id }
          );
          
          // Play notification sound
          playNotificationSound();
        });
        
        setNotifications(notifs);
      }, (error) => {
        console.error('Error listening to notifications:', error);
      });
      
      return () => {
        if (unsubscribeNotifications) {
          unsubscribeNotifications();
        }
      };
    }
  }, [userData, notifications.length]); // Add notifications.length as dependency

  const setupPushNotifications = async () => {
    try {
      // Request permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Push notification permission denied');
        return;
      }

      console.log('Push notifications enabled');
    } catch (error) {
      console.error('Error setting up push notifications:', error);
    }
  };

  // Play notification sound
  const playNotificationSound = async () => {
    try {
      console.log('🔔 New notification with sound!');
      // Play notification sound file
      const player = new AudioPlayer(require('./assets/new_notification_09_352705.mp3'));
      await player.play();
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut(auth);
              onLogout();
            } catch (error) {
              Alert.alert('Error', 'Failed to logout');
            }
          }
        }
      ]
    );
  };

  const refreshUserData = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserData({ uid: user.uid, ...userDoc.data() });
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const navigateToScreen = (screen) => {
    setActiveTab(screen);
    
    // Refresh user data to ensure balance is current on every navigation
    const refreshUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData({ uid: user.uid, ...userDoc.data() });
          }
        }
      } catch (error) {
        console.error('Error refreshing user data:', error);
      }
    };
    refreshUserData();
  };

  const handleQRScanResult = (email) => {
    setScannedEmail(email);
    console.log('QR scan result received:', email);
  };

  const renderScreen = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardScreen userData={userData} onNavigate={navigateToScreen} onViewAllTransactions={() => setShowTransactionsModal(true)} />;
      case 'send':
        return <SendMoneyScreen userData={userData} onNavigate={navigateToScreen} onUserDataUpdate={refreshUserData} scannedEmail={scannedEmail} onClearScannedEmail={() => setScannedEmail(null)} />;
      case 'scanner':
        return <QRScannerScreen onNavigate={navigateToScreen} onScanResult={handleQRScanResult} />;
      case 'notifications':
        return <NotificationsScreen userData={userData} onNavigate={navigateToScreen} />;
      case 'profile':
        return <ProfileScreen userData={userData} onNavigate={navigateToScreen} onLogout={handleLogout} />;
      default:
        return <DashboardScreen userData={userData} onNavigate={navigateToScreen} onViewAllTransactions={() => setShowTransactionsModal(true)} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E319D" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.homeContainer}>
      <StatusBar style="dark" />
      
      {/* Main Content */}
      <View style={styles.content}>
        {renderScreen()}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navItem, activeTab === 'dashboard' && styles.activeNavItem]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Ionicons
            name={activeTab === 'dashboard' ? 'home' : 'home-outline'}
            size={24}
            color={activeTab === 'dashboard' ? '#1E319D' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'send' && styles.activeNavItem]}
          onPress={() => setActiveTab('send')}
        >
          <Ionicons
            name={activeTab === 'send' ? 'paper-plane' : 'paper-plane-outline'}
            size={24}
            color={activeTab === 'send' ? '#1E319D' : '#9CA3AF'}
          />
        </TouchableOpacity>

        {/* QR Scanner Button - Center with special styling */}
        <TouchableOpacity
          style={[styles.navItem, styles.scannerNavItem, activeTab === 'scanner' && styles.activeScannerNavItem]}
          onPress={() => setActiveTab('scanner')}
        >
          <View style={[
            styles.scannerIconContainer,
            activeTab === 'scanner' && styles.scannerIconContainerActive
          ]}>
            <Ionicons
              name={activeTab === 'scanner' ? 'qr-code' : 'qr-code-outline'}
              size={28}
              color="#ffffff"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'notifications' && styles.activeNavItem]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons
            name={activeTab === 'notifications' ? 'notifications' : 'notifications-outline'}
            size={24}
            color={activeTab === 'notifications' ? '#1E319D' : '#9CA3AF'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navItem, activeTab === 'profile' && styles.activeNavItem]}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={24}
            color={activeTab === 'profile' ? '#1E319D' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>

      {/* Transactions Modal */}
      <TransactionsModal 
        visible={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        userData={userData}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  homeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
  },

  // Welcome Section
  welcomeSection: {
    backgroundColor: '#ffffff',
    marginTop: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  welcomeContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },


  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  actionBtnText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },

  // Info Card
  infoCard: {
    backgroundColor: '#ffffff',
    marginBottom: 20,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  viewAllText: {
    color: '#1E319D',
    fontWeight: '600',
    fontSize: 16,
  },

  // Transactions
  transactionItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  transactionStatus: {
    fontSize: 12,
    color: '#16A34A',
    textTransform: 'capitalize',
  },

  // Notifications
  notificationItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  unreadNotification: {
    backgroundColor: '#EFF6FF',
    borderLeftWidth: 4,
    borderLeftColor: '#1E319D',
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // Coming Soon
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  comingSoonTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 16,
    color: '#6B7280',
  },

  // Profile
  profileCard: {
    backgroundColor: '#ffffff',
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#6B7280',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    color: '#dc2626',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 16,
  },

  // Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  activeNavItem: {
    backgroundColor: '#EFF6FF',
  },
  
  // Dashboard Header
  dashboardHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  dashboardTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Anton_400Regular',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  
// Simple Balance Card
balanceCard: {
  backgroundColor: '#ffffff',
  marginHorizontal: 16,
  marginBottom: 20,
  padding: 24,
  borderRadius: 12,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 3,
},

// New style for the header row containing label and QR button
balanceHeader: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'flex-start', // Align to top instead of center
  marginBottom: 4,
},

balanceLabel: {
  color: '#4A5568', // Softer, more sophisticated gray
  fontWeight: '600', // Semi-bold for better readability
  fontSize: 16,
  letterSpacing: 0.5, // Slight letter spacing for elegance
  textTransform: 'uppercase', // Banking apps often use uppercase labels
  flex: 1,
},

balanceAmount: {
  color: '#1E319D',
  fontSize: 30, // Slightly larger to complement Bebas Neue
  fontWeight: '100', // Bebas Neue is naturally bold, so use normal weight
  fontFamily: 'Anton_400Regular', // Use Anton font instead of bebas-neue
  letterSpacing: 1, // Bebas Neue looks great with more spacing
  lineHeight: 42, // Adjusted for the new font
  marginBottom: 12,
},

qrButton: {
  backgroundColor: '#F8FAFC',
  padding: 8,
  borderRadius: 6,
  alignItems: 'center',
  justifyContent: 'center',
  marginLeft: 12, // Add some space between label and QR button
},
  
  // Enhanced Sections
  section: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewAllText: {
    color: '#1E319D',
    fontWeight: '600',
    marginRight: 4,
  },
  

  transactionSeparator: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 2,
    marginHorizontal: 16,
  },
  
  // Enhanced Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginVertical: 8,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  // Enhanced QR Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  qrModal: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 10,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000ff',
    fontFamily: 'Anton_400Regular',
  },
  closeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  qrContent: {
    padding: 24,
    alignItems: 'center',
  },
  qrContainer: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000000ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 24,
  },
  qrInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrEmail: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000ff',
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  qrActions: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  shareButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shareButtonText: {
    color: '#1E319D',
    fontWeight: '600',
    marginLeft: 8,
  },
  downloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E319D',
    paddingVertical: 14,
    borderRadius: 12,
  },
  downloadButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Enhanced Transaction Styles
  transactionItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    marginVertical: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#6B7280',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  transactionStatus: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  
  // Transactions Modal specific styles
  transactionsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  transactionsLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyTransactionsStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTransactionsStateIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTransactionsStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: 'Anton_400Regular',
    textAlign: 'center',
  },
  emptyTransactionsStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  reloadTransactionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E319D',
  },
  reloadTransactionsButtonText: {
    color: '#1E319D',
    fontWeight: '600',
    marginLeft: 8,
  },

  // Enhanced Notifications Styles
  notificationsHeader: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationsHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationsTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Anton_400Regular',
  },
  markAllReadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  unreadBadgeContainer: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  notificationsListContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  notificationItemContainer: {
    marginBottom: 8,
  },
  unreadNotificationContainer: {
    transform: [{ scale: 1.02 }],
  },
  notificationCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  notificationIconContainer: {
    position: 'relative',
    marginRight: 16,
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  notificationTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationAmountContainer: {
    marginTop: 4,
  },
  notificationAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  markReadButton: {
    padding: 8,
    marginLeft: 8,
  },
  notificationSeparator: {
    height: 8,
  },
  emptyNotificationsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyNotificationsState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyNotificationsIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyNotificationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    fontFamily: 'Anton_400Regular',
  },
  emptyNotificationsSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Enhanced Profile Styles
  profileHeaderContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileScreenTitle: {
    fontSize: 28,
    fontWeight: '600',
    color: '#1F2937',
    fontFamily: 'Anton_400Regular',
  },
  profileSettingsButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  profileAccountInfoCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileCardHeaderSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileCardIconTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCardTitleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E319D',
    marginLeft: 12,
    fontFamily: 'Anton_400Regular',
  },
  profileAvatarSectionContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileUserAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileUserAvatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  profileUserDisplayName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E319D',
    marginBottom: 4,
    fontFamily: 'Anton_400Regular',
  },
  profileUserEmailAddress: {
    fontSize: 16,
    color: '#6B7280',
  },
  profileInformationGrid: {
    gap: 16,
  },
  profileInfoRowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  profileInfoLabelText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileInfoValueText: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  profileBalanceText: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
  profileLogoutSection: {
    marginHorizontal: 16,
    marginBottom: 40,
  },
  profileLogoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  profileLogoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  // Settings Modal Styles
  settingsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  settingsModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    marginTop: '10%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    flex: 1,
  },
  settingsModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingsModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'Anton_400Regular',
  },
  settingsCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  settingsModalContent: {
    flex: 1,
    padding: 20,
  },
  settingsPasswordSection: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  settingsPasswordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingsPasswordTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E319D',
    marginLeft: 12,
    fontFamily: 'Anton_400Regular',
  },
  settingsPasswordForm: {
    gap: 20,
  },
  settingsPasswordInputGroup: {
    gap: 8,
  },
  settingsPasswordLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingsPasswordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingsPasswordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  settingsPasswordToggle: {
    padding: 16,
  },
  settingsUpdatePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E319D',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  settingsUpdatePasswordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  settingsButtonDisabled: {
    opacity: 0.6,
  },

  // Enhanced Profile Styles
  profileAccountCard: {
    backgroundColor: '#ffffff',
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profilePasswordCard: {
    backgroundColor: '#ffffff',
    marginBottom: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  profileCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  profileCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E319D',
    marginLeft: 12,
    fontFamily: 'Anton_400Regular',
  },
  profileAvatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 36,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  profileUserName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E319D',
    marginBottom: 4,
    fontFamily: 'Anton_400Regular',
  },
  profileUserEmail: {
    fontSize: 16,
    color: '#6B7280',
  },
  profileDetailsGrid: {
    gap: 16,
  },
  profileDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  profileDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  profileDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  balanceText: {
    color: '#16A34A',
    fontWeight: 'bold',
  },
  
  // Password Form Styles
  passwordForm: {
    gap: 20,
  },
  passwordInputGroup: {
    gap: 8,
  },
  passwordLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  passwordToggle: {
    padding: 16,
  },
  updatePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E319D',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  updatePasswordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  logoutSection: {
    marginBottom: 40,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutText: {
    color: '#DC2626',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  
  // Enhanced Transaction Styles
  filterSection: {
    backgroundColor: '#ffffff',
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dateFilterRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateInputText: {
    fontSize: 14,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
  },
  applyFilterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E319D',
    paddingVertical: 12,
    borderRadius: 8,
  },
  resetFilterButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  filterButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButtonText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  filterStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  filterStatusText: {
    color: '#1E319D',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  transactionsSection: {
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#1E319D',
    fontWeight: '600',
    marginLeft: 4,
  },
  transactionListItem: {
    marginVertical: 4,
  },
  transactionItemContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
  },
  transactionTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionPersonName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  transactionDateTime: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 2,
  },
  transactionId: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  transactionAmountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  transactionStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  emptyTransactionsState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  // Transaction Details Modal
  transactionDetailsModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 0,
    width: '90%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  transactionModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  transactionModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E319D',
    fontFamily: 'Anton_400Regular',
  },
  transactionModalContent: {
    padding: 24,
  },
  transactionModalAmount: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalAmountText: {
    fontSize: 32,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  modalTransactionType: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  transactionModalDetails: {
    gap: 16,
    marginBottom: 24,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  modalDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  modalDetailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  modalCloseButton: {
    backgroundColor: '#1E319D',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Transactions Modal Styles
  transactionsModalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: '90%',
    marginTop: '10%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    fontFamily: 'Anton_400Regular',
  },
  filtersContainer: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  filterRow: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeFilterButton: {
    backgroundColor: '#1E319D',
    borderColor: '#1E319D',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeFilterText: {
    color: '#ffffff',
  },
  resultsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F8FAFC',
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  transactionsList: {
    flex: 1,
  },
  transactionsListContent: {
    padding: 20,
  },
  transactionsLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  transactionsLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  emptyTransactionsStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTransactionsStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTransactionsStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTransactionsStateSubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  modalTransactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionDetailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    margin: 20,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  transactionDetailContent: {
    padding: 24,
  },
  closeDetailButton: {
    backgroundColor: '#1E319D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  closeDetailButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Send Money Screen Styles
  sendMoneyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  sendMoneyTitle: {
    color: '#000000ff',
    fontSize: 24, // Slightly larger to complement Bebas Neue
    fontWeight: '400', // Bebas Neue is naturally bold, so use normal weight
    fontFamily: 'Anton_400Regular', // Use Anton font instead of bebas-neue
    letterSpacing: 1, // Bebas Neue looks great with more spacing
    lineHeight: 42, // Adjusted for the new font
    marginBottom: 0,
  },
  balanceDisplay: {
    alignItems: 'flex-end',
  },
  sendMoneyBalance: {
    fontSize: 16,
    fontWeight: '600',
    color: '#16A34A',
    fontFamily: 'Anton_400Regular',
  },
  searchSection: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1F2937',
  },
  clearButton: {
    padding: 4,
  },
  searchResultsContainer: {
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  searchLoadingText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noResultsText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  recentRecipientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 30,
    marginHorizontal: 15,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  recipientAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  recipientAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  recipientDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 1,
  },
  lastSentAmount: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
  },
  sendAgainIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F9FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recipientSeparator: {
    height: 8,
  },
  selectedRecipientSection: {
    padding: 20,
  },
  changeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  changeButtonText: {
    fontSize: 14,
    color: '#1E319D',
    fontWeight: '500',
  },
  selectedRecipientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  largeRecipientAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  largeAvatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  selectedRecipientInfo: {
    flex: 1,
  },
  selectedRecipientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedRecipientDetail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  formGroup: {
    marginHorizontal: 20,
    marginBottom: 16,
  },
  formGroupTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1E319D',
    marginRight: 8,
    fontFamily: 'Anton_400Regular',
  },
  amountInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: '#1F2937',
    fontWeight: '600',
  },
  balanceInfo: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  sendButtonContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  sendButton: {
    backgroundColor: '#1E319D',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Confirmation Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '100%',
    minHeight: '98%',
    paddingBottom: 18,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSpacer: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipientSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  recipientAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  recipientInitials: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  recipientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  recipientEmail: {
    fontSize: 14,
    color: '#666',
  },
  amountSection: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amountValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E319D',
  },
  noteContainer: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
  },
  noteText: {
    fontSize: 14,
    color: '#1976d2',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  detailsSection: {
    backgroundColor: '#f8f9fa',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  totalRow: {
    borderBottomWidth: 0,
    paddingTop: 15,
    marginTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#1E319D',
  },
  totalLabel: {
    fontSize: 16,
    color: '#1E319D',
    fontWeight: 'bold',
  },
  totalValue: {
    fontSize: 16,
    color: '#1E319D',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  actionSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  processingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  processingText: {
    fontSize: 16,
    color: '#1E319D',
    marginTop: 10,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  confirmButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 10,
    backgroundColor: '#1E319D',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  successScreen: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  successIcon: {
    marginBottom: 30,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 15,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
  },
  doneButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
  },
  doneButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  fullScreenDetails: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 50,
  },
  fullScreenDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  totalRow: {
    borderBottomWidth: 0,
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 2,
    borderTopColor: 'rgba(255, 255, 255, 0.3)',
  },
  fullScreenDetailLabel: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  fullScreenDetailValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  fullScreenDetailLabelBold: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  fullScreenDetailValueBold: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: 'bold',
    textAlign: 'right',
    flex: 1,
    marginLeft: 20,
  },
  swipeContainer: {
    marginTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  swipeTrack: {
    height: 70,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  swipeText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  swipeButton: {
    position: 'absolute',
    left: 5,
    top: 5,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  fullScreenProcessing: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenProcessingText: {
    fontSize: 20,
    color: '#ffffff',
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  fullScreenProcessingSubtext: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#16A34A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 15,
    textAlign: 'center',
    fontFamily: 'Anton_400Regular',
  },
  successSubtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 26,
  },

  // QR Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  scannerBackButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  scannerHeaderTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Anton_400Regular',
  },
  scannerHeaderSpacer: {
    width: 40,
  },
  scannerViewContainer: {
    flex: 1,
    position: 'relative',
  },
  scannerView: {
    flex: 1,
  },
  scannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#1E319D',
    borderWidth: 3,
  },
  scannerCornerTopLeft: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  scannerCornerTopRight: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  scannerCornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  scannerCornerBottomRight: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scannerInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  scannerInstructionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  scannerInstructionText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  scannerRetryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  scannerRetryText: {
    color: '#1E319D',
    fontWeight: '600',
    marginLeft: 8,
  },
  scannerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  scannerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  scannerText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  scannerButton: {
    backgroundColor: '#1E319D',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scannerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Enhanced Bottom Navigation for QR Scanner
  scannerNavItem: {
    position: 'relative',
  },
  scannerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E319D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E319D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  scannerIconContainerActive: {
    backgroundColor: '#0F1E5A', // Darker blue when active
    transform: [{ scale: 1.1 }],
  },
  activeScannerNavItem: {
    transform: [{ scale: 1.1 }],
  },
});

export default Home;
