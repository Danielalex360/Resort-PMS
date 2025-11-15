import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, ChevronLeft, ChevronRight, Plus, X, UserCheck, LogOut, DollarSign } from 'lucide-react';
import { BookingDrawer } from './BookingDrawer';
import { CheckInModal } from './CheckInModal';
import { CheckOutModal } from './CheckOutModal';
import { PaymentRecordModal } from './PaymentRecordModal';

interface Booking {
  id: string;
  check_in: string;
  check_out: string;
  nights: number;
  guest_name: string;
  room_type_id: string;
  price_total: number;
  status: string;
  payment_status: string;
}

interface RoomType {
  id: string;
  name: string;
  code: string;
  total_units?: number;
}

export function BookingCalendar({ resortId }: { resortId: string }) {
  const [viewDays, setViewDays] = useState<7 | 14 | 31>(14);
  const [startDate, setStartDate] = useState(new Date());
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [checkInModalOpen, setCheckInModalOpen] = useState(false);
  const [checkOutModalOpen, setCheckOutModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [newBookingDate, setNewBookingDate] = useState<{ roomTypeId: string; date: string } | null>(
    null
  );

  useEffect(() => {
    loadData();
  }, [resortId, startDate, viewDays]);

  const loadData = async () => {
    const { data: roomData } = await supabase
      .from('room_types')
      .select('*')
      .eq('resort_id', resortId)
      .eq('is_active', true)
      .order('order_index');

    if (roomData) {
      const roomTypesWithCounts = await Promise.all(
        roomData.map(async (roomType) => {
          const { count } = await supabase
            .from('room_units')
            .select('*', { count: 'exact', head: true })
            .eq('room_type_id', roomType.id)
            .eq('is_active', true);
          return { ...roomType, total_units: count || 0 };
        })
      );
      setRoomTypes(roomTypesWithCounts);
    } else {
      setRoomTypes([]);
    }

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + viewDays);

    const { data: bookingData } = await supabase
      .from('bookings')
      .select('*')
      .eq('resort_id', resortId)
      .gte('check_in', startDate.toISOString().slice(0, 10))
      .lte('check_in', endDate.toISOString().slice(0, 10))
      .order('check_in');

    setBookings(bookingData || []);
  };

  const getDatesArray = () => {
    const dates: Date[] = [];
    for (let i = 0; i < viewDays; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  };

  const getBookingsForCell = (roomTypeId: string, date: Date) => {
    const dateStr = date.toISOString().slice(0, 10);
    return bookings.filter((b) => {
      const checkIn = new Date(b.check_in);
      const checkOut = new Date(b.check_out);
      const current = new Date(dateStr);
      return b.room_type_id === roomTypeId &&
             b.status !== 'cancelled' &&
             checkIn <= current &&
             checkOut > current;
    });
  };

  const getAvailability = (roomTypeId: string, date: Date) => {
    const roomType = roomTypes.find(rt => rt.id === roomTypeId);
    const totalUnits = roomType?.total_units || 0;
    const bookingsForDate = getBookingsForCell(roomTypeId, date);
    const booked = bookingsForDate.length;
    const available = totalUnits - booked;
    return { total: totalUnits, booked, available };
  };

  const getBookingWidth = (booking: Booking, date: Date) => {
    const checkIn = new Date(booking.check_in);
    const dateStart = new Date(date);
    const daysFromStart = Math.max(0, Math.ceil((dateStart - checkIn) / (1000 * 60 * 60 * 24)));
    const remainingNights = booking.nights - daysFromStart;
    return Math.min(remainingNights, viewDays);
  };

  const isBookingStart = (booking: Booking, date: Date) => {
    return booking.check_in === date.toISOString().slice(0, 10);
  };

  const handleCellClick = (roomTypeId: string, date: Date) => {
    const cellBookings = getBookingsForCell(roomTypeId, date);
    if (cellBookings.length > 0) {
      setSelectedBooking(cellBookings[0]);
    } else {
      setNewBookingDate({ roomTypeId, date: date.toISOString().slice(0, 10) });
      setSelectedBooking(null);
    }
    setDrawerOpen(true);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(startDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setStartDate(newDate);
  };

  const goToToday = () => {
    setStartDate(new Date());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'confirmed':
        return 'bg-emerald-500';
      case 'guaranteed':
        return 'bg-emerald-600';
      case 'unpaid':
        return 'bg-orange-500';
      case 'paid':
        return 'bg-green-600';
      case 'checked-in':
        return 'bg-blue-600';
      case 'checked-out':
        return 'bg-slate-600';
      case 'cancelled':
        return 'bg-slate-300 opacity-50';
      case 'refunded':
        return 'bg-slate-400 opacity-50';
      case 'no-show':
        return 'bg-red-400 opacity-50';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-blue-500';
    }
  };

  const dates = getDatesArray();

  return (
    <div className="max-w-full mx-auto px-4">
      <div className="bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Calendar className="text-emerald-600" size={28} />
              <h2 className="text-2xl font-bold text-slate-900">Booking Calendar</h2>
            </div>

            <div className="flex gap-2">
              {[7, 14, 31].map((days) => (
                <button
                  key={days}
                  onClick={() => setViewDays(days as 7 | 14 | 31)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    viewDays === days
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth(-1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={goToToday}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
              >
                Today
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            <div className="text-lg font-semibold text-slate-900">
              {startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-max">
            <div className="grid grid-cols-[200px_repeat(var(--days),120px)] gap-0 border-b border-slate-200" style={{ '--days': viewDays } as any}>
              <div className="sticky left-0 bg-slate-50 p-4 border-r border-slate-200 font-semibold text-slate-700">
                Room Type
              </div>
              {dates.map((date) => (
                <div
                  key={date.toISOString()}
                  className="p-2 text-center border-r border-slate-200 bg-slate-50"
                >
                  <div className="text-xs font-medium text-slate-600">
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </div>
                  <div className="text-sm font-semibold text-slate-900">
                    {date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))}
            </div>

            {roomTypes.map((roomType) => (
              <div
                key={roomType.id}
                className="grid grid-cols-[200px_repeat(var(--days),120px)] gap-0 border-b border-slate-200 min-h-[80px]"
                style={{ '--days': viewDays } as any}
              >
                <div className="sticky left-0 bg-white p-4 border-r border-slate-200 flex items-center">
                  <div>
                    <div className="font-semibold text-slate-900">{roomType.name}</div>
                    <div className="text-xs text-slate-500">{roomType.code}</div>
                    {roomType.total_units !== undefined && (
                      <div className="text-xs text-emerald-600 font-medium mt-1">
                        {roomType.total_units} {roomType.total_units === 1 ? 'unit' : 'units'}
                      </div>
                    )}
                  </div>
                </div>

                {dates.map((date, dateIndex) => {
                  const cellBookings = getBookingsForCell(roomType.id, date);
                  const showBooking =
                    cellBookings.length > 0 && isBookingStart(cellBookings[0], date);
                  const availability = getAvailability(roomType.id, date);

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => handleCellClick(roomType.id, date)}
                      className="relative border-r border-slate-200 hover:bg-slate-50 cursor-pointer group transition-colors p-2"
                    >
                      {!showBooking && availability.total > 0 && (
                        <div className={`text-xs text-center ${
                          availability.available > 0 ? 'text-emerald-600' : 'text-red-600'
                        }`}>
                          {availability.available}/{availability.total}
                        </div>
                      )}
                      {showBooking && (
                        <div
                          className={`absolute top-2 left-1 right-1 h-16 rounded-lg ${getStatusColor(
                            cellBookings[0].status
                          )} text-white p-2 shadow-md hover:shadow-lg transition-shadow z-10 overflow-hidden ${
                            cellBookings[0].status === 'cancelled' ? 'line-through' : ''
                          }`}
                          style={{
                            width: `calc(${getBookingWidth(cellBookings[0], date) * 120}px - 8px)`,
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">
                                {cellBookings[0].guest_name || 'Guest'}
                                {cellBookings[0].status === 'cancelled' && (
                                  <span className="ml-1 text-xs font-normal">(Cancelled)</span>
                                )}
                              </div>
                              <div className="text-xs opacity-90">
                                {cellBookings[0].nights}n · RM {cellBookings[0].price_total?.toFixed(0)}
                              </div>
                              <div className="text-xs opacity-75 capitalize">
                                {cellBookings[0].payment_status}
                              </div>
                            </div>
                            {cellBookings[0].status !== 'cancelled' && (
                              <div className="flex gap-1 ml-2">
                                {cellBookings[0].status === 'confirmed' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBooking(cellBookings[0]);
                                      setCheckInModalOpen(true);
                                    }}
                                    className="p-1 bg-white/20 hover:bg-white/40 rounded transition-colors"
                                    title="Check-in"
                                  >
                                    <UserCheck size={12} />
                                  </button>
                                )}
                                {cellBookings[0].status === 'checked-in' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBooking(cellBookings[0]);
                                      setCheckOutModalOpen(true);
                                    }}
                                    className="p-1 bg-white/20 hover:bg-white/40 rounded transition-colors"
                                    title="Check-out"
                                  >
                                    <LogOut size={12} />
                                  </button>
                                )}
                                {cellBookings[0].balance_due > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedBooking(cellBookings[0]);
                                      setPaymentModalOpen(true);
                                    }}
                                    className="p-1 bg-white/20 hover:bg-white/40 rounded transition-colors"
                                    title="Add Payment"
                                  >
                                    <DollarSign size={12} />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {cellBookings.length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Plus size={20} className="text-slate-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <BookingDrawer
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedBooking(null);
          setNewBookingDate(null);
          loadData();
        }}
        resortId={resortId}
        booking={selectedBooking}
        newBookingData={newBookingDate}
      />

      {selectedBooking && (
        <>
          <CheckInModal
            open={checkInModalOpen}
            onClose={() => {
              setCheckInModalOpen(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
            resortId={resortId}
            onCheckInComplete={loadData}
          />

          <CheckOutModal
            open={checkOutModalOpen}
            onClose={() => {
              setCheckOutModalOpen(false);
              setSelectedBooking(null);
            }}
            booking={selectedBooking}
            resortId={resortId}
            onCheckOutComplete={loadData}
          />

          <PaymentRecordModal
            open={paymentModalOpen}
            onClose={() => {
              setPaymentModalOpen(false);
              setSelectedBooking(null);
            }}
            bookingId={selectedBooking.id}
            resortId={resortId}
            balanceDue={selectedBooking.balance_due || 0}
            onPaymentRecorded={loadData}
          />
        </>
      )}
    </div>
  );
}
